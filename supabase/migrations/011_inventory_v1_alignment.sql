DROP FUNCTION IF EXISTS start_inventory_count(inventory_count_type, UUID[], TEXT);
DROP FUNCTION IF EXISTS start_inventory_count(inventory_count_type, UUID[], TEXT, UUID);

CREATE OR REPLACE FUNCTION start_inventory_count(
  p_count_type   inventory_count_type,
  p_product_ids  UUID[] DEFAULT NULL,
  p_notes        TEXT DEFAULT NULL,
  p_created_by   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id         UUID;
  v_count_id        UUID := gen_random_uuid();
  v_item_count      INT := 0;
  v_requested_count INT := 0;
BEGIN
  v_user_id := fn_require_admin_actor(p_created_by);

  IF p_product_ids IS NOT NULL AND array_length(p_product_ids, 1) > 0 THEN
    SELECT COUNT(*)
      INTO v_requested_count
      FROM (SELECT DISTINCT unnest(p_product_ids) AS id) AS requested_products;
  END IF;

  INSERT INTO inventory_counts (id, count_type, notes, created_by)
  VALUES (v_count_id, p_count_type, p_notes, v_user_id);

  INSERT INTO inventory_count_items (
    inventory_count_id,
    product_id,
    system_quantity,
    actual_quantity,
    difference,
    reason
  )
  SELECT
    v_count_id,
    p.id,
    p.stock_quantity,
    p.stock_quantity,
    0,
    NULL
  FROM products p
  WHERE p.is_active = true
    AND (
      p_product_ids IS NULL
      OR array_length(p_product_ids, 1) IS NULL
      OR p.id = ANY(p_product_ids)
    );

  GET DIAGNOSTICS v_item_count = ROW_COUNT;

  IF v_item_count = 0 OR (v_requested_count > 0 AND v_requested_count <> v_item_count) THEN
    RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND';
  END IF;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'start_inventory_count',
    'inventory_counts',
    v_count_id,
    'بدء عملية جرد ' || p_count_type,
    jsonb_build_object('count_type', p_count_type, 'items', v_item_count)
  );

  RETURN jsonb_build_object(
    'count_id', v_count_id,
    'count_type', p_count_type,
    'item_count', v_item_count,
    'status', 'in_progress'
  );
END;
$$;

DROP FUNCTION IF EXISTS complete_inventory_count(UUID, JSONB);
DROP FUNCTION IF EXISTS complete_inventory_count(UUID, JSONB, UUID);

CREATE OR REPLACE FUNCTION complete_inventory_count(
  p_inventory_count_id UUID,
  p_items              JSONB,
  p_created_by         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       UUID;
  v_count         RECORD;
  v_item          JSONB;
  v_adjusted      INT := 0;
  v_total_diff    INT := 0;
  v_sys_qty       INT;
  v_act_qty       INT;
  v_diff          INT;
  v_item_id       UUID;
  v_product_id    UUID;
  v_reason        VARCHAR(255);
BEGIN
  v_user_id := fn_require_admin_actor(p_created_by);

  SELECT * INTO v_count FROM inventory_counts WHERE id = p_inventory_count_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ERR_COUNT_NOT_FOUND'; END IF;
  IF v_count.status = 'completed' THEN RAISE EXCEPTION 'ERR_COUNT_ALREADY_COMPLETED'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_act_qty := (v_item->>'actual_quantity')::INT;
    IF v_act_qty < 0 THEN RAISE EXCEPTION 'ERR_VALIDATION_NEGATIVE_QUANTITY'; END IF;

    IF v_item ? 'inventory_count_item_id' THEN
      SELECT i.id, i.product_id, p.stock_quantity
        INTO v_item_id, v_product_id, v_sys_qty
        FROM inventory_count_items i
        JOIN products p ON p.id = i.product_id
       WHERE i.id = (v_item->>'inventory_count_item_id')::UUID
         AND i.inventory_count_id = p_inventory_count_id
       FOR UPDATE;
    ELSE
      SELECT i.id, i.product_id, p.stock_quantity
        INTO v_item_id, v_product_id, v_sys_qty
        FROM inventory_count_items i
        JOIN products p ON p.id = i.product_id
       WHERE i.inventory_count_id = p_inventory_count_id
         AND i.product_id = (v_item->>'product_id')::UUID
       FOR UPDATE;
    END IF;

    IF v_item_id IS NULL OR v_product_id IS NULL THEN
      RAISE EXCEPTION 'ERR_PRODUCT_NOT_FOUND';
    END IF;

    v_diff := v_act_qty - v_sys_qty;
    v_reason := CASE
      WHEN v_item ? 'reason' THEN NULLIF(v_item->>'reason', '')
      ELSE NULL
    END;

    UPDATE inventory_count_items
       SET actual_quantity = v_act_qty,
           difference = v_diff,
           reason = COALESCE(v_reason, inventory_count_items.reason)
     WHERE id = v_item_id;

    IF v_diff <> 0 THEN
      UPDATE products
         SET stock_quantity = v_act_qty
       WHERE id = v_product_id;

      v_adjusted := v_adjusted + 1;
      v_total_diff := v_total_diff + ABS(v_diff);
    END IF;
  END LOOP;

  UPDATE inventory_counts
     SET status = 'completed',
         completed_at = now()
   WHERE id = p_inventory_count_id;

  IF v_adjusted > 0 THEN
    INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
    SELECT
      p.id,
      'low_stock',
      'فروقات جرد: ' || v_adjusted || ' منتج',
      'إجمالي الفرق: ' || v_total_diff || ' وحدة',
      'inventory_count',
      p_inventory_count_id
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;

  INSERT INTO audit_logs (user_id, action_type, table_name, record_id, description, new_values)
  VALUES (
    v_user_id,
    'complete_inventory_count',
    'inventory_counts',
    p_inventory_count_id,
    'إكمال جرد',
    jsonb_build_object('adjusted', v_adjusted, 'total_diff', v_total_diff)
  );

  RETURN jsonb_build_object(
    'count_id', p_inventory_count_id,
    'adjusted_products', v_adjusted,
    'total_difference', v_total_diff
  );
END;
$$;

REVOKE ALL ON FUNCTION start_inventory_count(inventory_count_type, UUID[], TEXT, UUID) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION complete_inventory_count(UUID, JSONB, UUID) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION start_inventory_count(inventory_count_type, UUID[], TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_inventory_count(UUID, JSONB, UUID) TO service_role;

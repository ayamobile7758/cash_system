import {
  calculateRestoreDriftFromBackup,
  isBackupPackageContent,
  maskPhoneNumber,
  type BackupPackageContent
} from "@/lib/api/portability";

describe("portability model helpers", () => {
  it("masks customer phone numbers", () => {
    expect(maskPhoneNumber("0791234567")).toBe("******4567");
  });

  it("validates backup bundle payloads", () => {
    expect(
      isBackupPackageContent({
        kind: "backup_bundle",
        generated_at: "2026-03-11T00:00:00Z",
        accounts: [],
        ledger_entries: [],
        products: [],
        expense_categories: [],
        snapshots: []
      })
    ).toBe(true);
  });

  it("calculates zero drift when balances match opening balance plus ledger", () => {
    const content: BackupPackageContent = {
      kind: "backup_bundle",
      generated_at: "2026-03-11T00:00:00Z",
      accounts: [
        {
          id: "account-1",
          name: "Cash",
          type: "cash",
          module_scope: "core",
          opening_balance: 10,
          current_balance: 13
        }
      ],
      ledger_entries: [
        {
          id: "entry-1",
          account_id: "account-1",
          entry_type: "income",
          adjustment_direction: null,
          amount: 5,
          entry_date: "2026-03-11",
          reference_type: "invoice",
          reference_id: "invoice-1"
        },
        {
          id: "entry-2",
          account_id: "account-1",
          entry_type: "expense",
          adjustment_direction: null,
          amount: 2,
          entry_date: "2026-03-11",
          reference_type: "expense",
          reference_id: "expense-1"
        }
      ],
      products: [],
      expense_categories: [],
      snapshots: []
    };

    expect(calculateRestoreDriftFromBackup(content)).toEqual([]);
  });
});

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type SpreadsheetCell = string | number | boolean | null | undefined;
export type SpreadsheetRows = SpreadsheetCell[][];
export type CsvRow = Record<string, unknown>;

export type SpreadsheetSheet = {
  name: string;
  rows: SpreadsheetRows;
};

const XML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const PKG_CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_DOC_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const WORKSHEET_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
const STYLES_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
const APP_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
const CORE_REL = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function unescapeXml(value: string) {
  return value
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function columnNumberToName(columnNumber: number) {
  let result = "";
  let current = columnNumber;

  while (current > 0) {
    const next = (current - 1) % 26;
    result = String.fromCharCode(65 + next) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function columnNameToNumber(columnName: string) {
  let result = 0;

  for (const char of columnName) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }

  return result;
}

function cellRef(rowNumber: number, columnNumber: number) {
  return `${columnNumberToName(columnNumber)}${rowNumber}`;
}

function sheetDimension(rows: SpreadsheetRows) {
  let maxColumn = 0;

  for (const row of rows) {
    if (row.length > maxColumn) {
      maxColumn = row.length;
    }
  }

  if (rows.length === 0 || maxColumn === 0) {
    return "A1";
  }

  return `A1:${cellRef(rows.length, maxColumn)}`;
}

function columnWidths(rows: SpreadsheetRows) {
  const widths: number[] = [];

  for (const row of rows) {
    row.forEach((value, index) => {
      const nextWidth = String(value ?? "").length + 2;
      widths[index] = Math.min(Math.max(widths[index] ?? 10, nextWidth), 32);
    });
  }

  return widths;
}

function worksheetXml(rows: SpreadsheetRows) {
  const widths = columnWidths(rows);
  const colsXml =
    widths.length > 0
      ? `<cols>${widths
          .map(
            (width, index) =>
              `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
          )
          .join("")}</cols>`
      : "";

  const rowsXml = rows
    .map((row, rowIndex) => {
      const cells: string[] = [];

      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const value = row[columnIndex];
        if (value === undefined || value === null) {
          continue;
        }

        const ref = cellRef(rowIndex + 1, columnIndex + 1);

        if (typeof value === "number" && Number.isFinite(value)) {
          cells.push(`<c r="${ref}"><v>${value}</v></c>`);
          continue;
        }

        if (typeof value === "boolean") {
          cells.push(`<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`);
          continue;
        }

        cells.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`);
      }

      return `<row r="${rowIndex + 1}">${cells.join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${XML_NS}">
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function workbookXml(sheets: SpreadsheetSheet[]) {
  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${XML_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="18000" windowHeight="12000"/>
  </bookViews>
  <sheets>${sheetEntries}</sheets>
</workbook>`;
}

function workbookRelsXml(sheets: SpreadsheetSheet[]) {
  const sheetRels = sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="${WORKSHEET_REL}" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="${STYLES_REL}" Target="styles.xml"/>
</Relationships>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}">
  <Relationship Id="rId1" Type="${OFFICE_DOC_REL}" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="${CORE_REL}" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="${APP_REL}" Target="docProps/app.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets: SpreadsheetSheet[]) {
  const sheetOverrides = sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${PKG_CONTENT_TYPES_NS}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  ${sheetOverrides}
</Types>`;
}

function appXml(sheets: SpreadsheetSheet[]) {
  const sheetNames = sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">${sheetNames}</vt:vector>
  </TitlesOfParts>
  <Company>OpenAI</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`;
}

function coreXml() {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${XML_NS}">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function getAttribute(attributes: string, attributeName: string) {
  const match = attributes.match(new RegExp(`${attributeName}="([^"]*)"`));
  return match?.[1] ?? "";
}

function parseRowCells(xml: string) {
  const rows: SpreadsheetRows = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xml))) {
    const attributes = rowMatch[1] ?? rowMatch[3] ?? "";
    const rowNumber = Number(getAttribute(attributes, "r"));
    if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
      continue;
    }

    const row: SpreadsheetCell[] = [];
    const innerXml = rowMatch[2] ?? "";
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(innerXml))) {
      const cellAttributes = cellMatch[1] ?? cellMatch[3] ?? "";
      const cellRefValue = getAttribute(cellAttributes, "r");
      const columnName = cellRefValue.replace(/\d+$/, "");
      const columnNumber = columnNameToNumber(columnName);
      const cellType = getAttribute(cellAttributes, "t");
      const cellXml = cellMatch[2] ?? "";
      const currentLength = row.length;
      if (columnNumber > currentLength) {
        row.length = columnNumber;
        for (let index = currentLength; index < columnNumber - 1; index += 1) {
          row[index] = "";
        }
      }

      if (cellType === "inlineStr") {
        const textMatch = cellXml.match(/<t(?:[^>]*)>([\s\S]*?)<\/t>/);
        row[columnNumber - 1] = unescapeXml(textMatch?.[1] ?? "");
        continue;
      }

      if (cellType === "b") {
        const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
        row[columnNumber - 1] = valueMatch?.[1] === "1";
        continue;
      }

      const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
      const rawValue = valueMatch?.[1] ?? "";
      row[columnNumber - 1] = rawValue === "" ? "" : Number(rawValue);
    }

    rows[rowNumber - 1] = row;
  }

  return Array.from({ length: rows.length }, (_, index) => rows[index] ?? []);
}

export function buildWorkbookBuffer(sheets: SpreadsheetSheet[]) {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml(sheets)),
    "_rels/.rels": strToU8(rootRelsXml()),
    "docProps/app.xml": strToU8(appXml(sheets)),
    "docProps/core.xml": strToU8(coreXml()),
    "xl/workbook.xml": strToU8(workbookXml(sheets)),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelsXml(sheets)),
    "xl/styles.xml": strToU8(stylesXml())
  };

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet.rows));
  });

  return Buffer.from(zipSync(files, { level: 6 }));
}

export function readWorkbookRows(buffer: Buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const workbookXmlText = strFromU8(files["xl/workbook.xml"]);
  const workbookRelsText = strFromU8(files["xl/_rels/workbook.xml.rels"]);
  const sheetEntries: Array<{ name: string; target: string }> = [];

  const relTargetMap = new Map<string, string>();
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  let relMatch: RegExpExecArray | null;

  while ((relMatch = relRegex.exec(workbookRelsText))) {
    const attributes = relMatch[1] ?? "";
    const id = getAttribute(attributes, "Id");
    const target = getAttribute(attributes, "Target");
    if (id && target) {
      relTargetMap.set(id, target);
    }
  }

  const sheetRegex = /<sheet\b([^>]*)\/>/g;
  let sheetMatch: RegExpExecArray | null;

  while ((sheetMatch = sheetRegex.exec(workbookXmlText))) {
    const attributes = sheetMatch[1] ?? "";
    const name = unescapeXml(getAttribute(attributes, "name"));
    const relId = getAttribute(attributes, "r:id");
    const target = relTargetMap.get(relId);
    if (name && target) {
      sheetEntries.push({ name, target: `xl/${target}`.replaceAll("//", "/") });
    }
  }

  const sheets: Record<string, SpreadsheetRows> = {};
  for (const sheet of sheetEntries) {
    const xmlBytes = files[sheet.target];
    if (!xmlBytes) {
      sheets[sheet.name] = [];
      continue;
    }

    const worksheetXmlText = strFromU8(xmlBytes);
    sheets[sheet.name] = parseRowCells(worksheetXmlText);
  }

  return sheets;
}

function parseCsvMatrix(content: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  const normalizedContent = content.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedContent.length; index += 1) {
    const char = normalizedContent[index];

    if (inQuotes) {
      if (char === '"') {
        if (normalizedContent[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.length > 1 || currentCell !== "" || normalizedContent.endsWith(",") || rows.length === 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvText(content: string) {
  if (content.length === 0) {
    return [] as CsvRow[];
  }

  const matrix = parseCsvMatrix(content);
  if (matrix.length === 0) {
    return [] as CsvRow[];
  }

  const [headerRow, ...bodyRows] = matrix;
  const headers = headerRow.map((header) => header.trim());

  return bodyRows
    .filter((row) => row.some((cell) => cell !== ""))
    .map(
      (row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])) as CsvRow
    );
}

export function serializeCsvRows(rows: CsvRow[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    }
  }

  const escapeCsvCell = (value: unknown) => {
    const text =
      value === null || value === undefined ? "" : typeof value === "string" ? value : String(value);
    const requiresQuotes = /[",\n\r]/.test(text) || /^\s|\s$/.test(text);

    if (!requiresQuotes) {
      return text;
    }

    return `"${text.replaceAll('"', '""')}"`;
  };

  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))
  ];

  return lines.join("\n");
}

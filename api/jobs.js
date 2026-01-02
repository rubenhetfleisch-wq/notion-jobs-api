import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  /* ===============================
     CORS
     =============================== */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (!process.env.NOTION_TOKEN) {
      throw new Error("NOTION_TOKEN missing");
    }
    if (!process.env.NOTION_DB_ID) {
      throw new Error("NOTION_DB_ID missing");
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,

      /* ========= FILTER ========= */
      filter: {
        property: "Online",
        checkbox: { equals: true }
      },

      /* ========= SORT ========= */
      sorts: [
        {
          property: "Added",
          direction: "descending"
        }
      ]
    });

    const items = response.results.map(page => {
      /* ---------- COMPANY LOGO ---------- */
      const logoFiles =
        page.properties["Company Logo"]?.files ?? [];

      let logo = null;
      for (const f of logoFiles) {
        if (f.type === "file" && f.file?.url) {
          logo = f.file.url;
          break;
        }
        if (f.type === "external" && f.external?.url) {
          logo = f.external.url;
          break;
        }
      }

      /* ---------- LOCATION ---------- */
      const locationPill =
        page.properties["Location (pill)"]?.select
          ?.name ?? "";

      const locationText =
        page.properties["Location (text)"]?.rich_text
          ?.map(t => t.plain_text)
          .join("") ?? "";

      return {
        id: page.id,

        title:
          page.properties["Job Title"]?.title?.[0]
            ?.plain_text ?? "",

        company:
          page.properties["Company Name"]?.rich_text
            ?.map(t => t.plain_text)
            .join("") ?? "",

        category:
          page.properties["Category"]?.select?.name ?? "",

        location: locationPill || locationText,

        link:
          page.properties["super:Link"]?.url ?? "",

        contact:
          page.properties["contact mail"]?.email ?? "",

        logo,

        added:
          page.properties["Added"]?.date?.start ??
          null
      };
    });

    return res.status(200).json({
      count: items.length,
      items
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}

import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  /* ===============================
     CORS – exakt wie bei Events
     =============================== */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Content-Type", "application/json");

  // Preflight
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
      filter: {
        property: "Published",
        checkbox: { equals: true }
      },
      sorts: [
        { property: "Added", direction: "ascending" }
      ]
    });

    const items = response.results.map(page => {
      /* ---------- IMAGE (Files & media) ---------- */
      const files = page.properties.image?.files ?? [];
      let image = null;

      for (const f of files) {
        if (f.type === "file" && f.file?.url) {
          image = f.file.url;
          break;
        }
        if (f.type === "external" && f.external?.url) {
          image = f.external.url;
          break;
        }
      }

      /* ---------- DESCRIPTION ---------- */
      const description =
        page.properties.Description?.rich_text
          ?.map(t => t.plain_text)
          .join("") ?? "";

      return {
        title:
          page.properties.name?.title?.[0]?.plain_text ?? "",
        desc: description,
        region:
          page.properties.Region?.select?.name ?? "",
        url:
          page.properties.url?.url ?? "",
        image,
        date: {
          start:
            page.properties.Date?.date?.start ?? null
        },
        featured:
          page.properties.Featured?.checkbox ?? false
      };
    });

    return res.status(200).json({ items });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
}

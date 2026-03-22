import { NextRequest, NextResponse } from "next/server";

const EDGAR_DATA_URL = "https://data.sec.gov/submissions";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;

  try {
    // Pad CIK to 10 digits
    const paddedCik = cik.padStart(10, "0");

    const [submissionsRes] = await Promise.allSettled([
      fetch(`${EDGAR_DATA_URL}/CIK${paddedCik}.json`, {
        headers: { "User-Agent": "NolaClaude research@example.com" },
        next: { revalidate: 3600 },
      }),
    ]);

    if (
      submissionsRes.status !== "fulfilled" ||
      !submissionsRes.value.ok
    ) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    const data = await submissionsRes.value.json();

    // Find Form D filings
    const formDFilings: {
      accessionNumber: string;
      filingDate: string;
      form: string;
    }[] = [];

    const recent = data.filings?.recent;
    if (recent) {
      for (let i = 0; i < (recent.form || []).length; i++) {
        if (recent.form[i] === "D" || recent.form[i] === "D/A") {
          formDFilings.push({
            accessionNumber: recent.accessionNumber[i],
            filingDate: recent.filingDate[i],
            form: recent.form[i],
          });
        }
      }
    }

    // Fetch XML for most recent Form D
    let formDDetails = null;
    if (formDFilings.length > 0) {
      const latest = formDFilings[0];
      const cleanAccession = latest.accessionNumber.replace(/-/g, "");
      const xmlUrl = `${EDGAR_ARCHIVE_URL}/${cik}/${cleanAccession}/primary_doc.xml`;

      const xmlRes = await fetch(xmlUrl, {
        headers: { "User-Agent": "NolaClaude research@example.com" },
        next: { revalidate: 3600 },
      });

      if (xmlRes.ok) {
        const xml = await xmlRes.text();
        const extract = (tag: string): string | undefined => {
          const match = xml.match(
            new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i")
          );
          return match?.[1]?.trim();
        };

        formDDetails = {
          totalOfferingAmount: extract("totalOfferingAmount"),
          totalAmountSold: extract("totalAmountSold"),
          minimumInvestment: extract("minimumInvestmentAccepted"),
          dateOfFirstSale: extract("dateOfFirstSale"),
          offeringSalesAmounts: extract("totalOfferingAmount"),
          revenueRange: extract("revenueRange"),
          investmentFundType: extract("investmentFundType"),
        };
      }
    }

    return NextResponse.json({
      cik,
      name: data.name,
      sic: data.sic,
      sicDescription: data.sicDescription,
      stateOfIncorporation: data.stateOfIncorporation,
      addresses: data.addresses,
      formDFilings,
      formDDetails,
    });
  } catch (error) {
    console.error("Fund detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund details" },
      { status: 500 }
    );
  }
}

import { requireAdminAuth } from "@/app/api/auth";

const CLOUDFLARE_API_TOKEN = "7cvjvmdYnGEdxIHiw6-1CweeHzkpl7OA3CjymNv9";
const ZONE_TAG = "amis-harmonie-sucy.fr";

interface AnalyticsData {
  visits: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  pageViews: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  requests: {
    total: number;
  };
}

export async function handleAdminAnalyticsApi(request: Request): Promise<Response> {
  // Verify admin authentication
  const auth = await requireAdminAuth(request);
  if (auth instanceof Response) return auth;

  try {
    // Get date ranges
    const endDate = new Date();
    const startDate30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // GraphQL query for Cloudflare Analytics
    const query = `
      query GetZoneAnalytics($zoneTag: string!, $since: Time!, $until: Time!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              limit: 30,
              filter: { date_geq: $since, date_leq: $until }
              orderBy: [date_DESC]
            ) {
              dimensions {
                date
              }
              sum {
                requests
                pageViews
                visits
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: ZONE_TAG,
          since: startDate30d.toISOString().split("T")[0],
          until: endDate.toISOString().split("T")[0],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare Analytics API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch analytics from Cloudflare" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await response.json()) as {
      errors?: unknown;
      data?: {
        viewer?: {
          zones?: {
            httpRequests1dGroups?: {
              dimensions: { date: string };
              sum: { visits: number; pageViews: number; requests: number };
            }[];
          }[];
        };
      };
    };

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return new Response(JSON.stringify({ error: "GraphQL query failed", details: data.errors }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process the data to extract metrics
    const dailyStats = data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    // Calculate metrics for different periods
    let last24h = 0;
    let last7d = 0;
    let last30d = 0;
    let totalPageViews = 0;
    let totalRequests = 0;
    let last24hPageViews = 0;
    let last7dPageViews = 0;
    let last30dPageViews = 0;

    const now = new Date();

    dailyStats.forEach(
      (day: {
        dimensions: { date: string };
        sum: { visits: number; pageViews: number; requests: number };
      }) => {
        const dayDate = new Date(day.dimensions.date);
        const daysDiff = (now.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24);
        const visits = day.sum.visits || 0;
        const pageViews = day.sum.pageViews || 0;
        const requests = day.sum.requests || 0;

        // Accumulate totals (all available data)
        totalPageViews += pageViews;
        totalRequests += requests;

        // Last 24 hours (most recent day)
        if (daysDiff <= 1) {
          last24h += visits;
          last24hPageViews += pageViews;
        }

        // Last 7 days
        if (daysDiff <= 7) {
          last7d += visits;
          last7dPageViews += pageViews;
        }

        // Last 30 days
        if (daysDiff <= 30) {
          last30d += visits;
          last30dPageViews += pageViews;
        }
      }
    );

    // Estimate total visits based on available data
    // This is an approximation since we only have 30 days of daily data
    const avgDailyVisits = dailyStats.length > 0 ? last30d / dailyStats.length : 0;
    const estimatedTotal = Math.round(avgDailyVisits * 365); // Rough estimate for a year

    const analytics: AnalyticsData = {
      visits: {
        total: estimatedTotal,
        last24h,
        last7d,
        last30d,
      },
      pageViews: {
        total: totalPageViews,
        last24h: last24hPageViews,
        last7d: last7dPageViews,
        last30d: last30dPageViews,
      },
      requests: {
        total: totalRequests,
      },
    };

    return new Response(JSON.stringify(analytics), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch analytics" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

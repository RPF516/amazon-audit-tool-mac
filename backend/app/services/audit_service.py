import json

def generate_summary(df, target_acos):
    summary = {}

    for _, row in df.iterrows():
        match_type = row.get("Match Type", "")
        targeting = str(row.get("Targeting", "")).lower()

        # ======================
        # Targeting Type Mapping (EXACT Excel logic)
        # ======================
        if match_type == "-":
            # Excel: "=~*" → Automatic Legacy Campaigns
            if targeting.startswith("~"):
                t_type = "Automatic Legacy Campaigns"
            else:
                t_type = "Automatic Targets"

        elif match_type == "BROAD":
            t_type = "Broad"

        elif match_type == "PHRASE":
            t_type = "Phrase"

        elif match_type == "EXACT":
            t_type = "Exact"

        elif targeting.startswith("asin"):
            t_type = "ASIN Targeting"

        elif targeting.startswith("category"):
            t_type = "Category Targeting"

        else:
            t_type = "Other"

        # ======================
        # Initialize group
        # ======================
        if t_type not in summary:
            summary[t_type] = {
                "sales": 0,
                "spend": 0,
                "total_keywords": 0,
                "profitable_keywords": 0,
                "profitable_sales": 0,
                "unprofitable_keywords": 0,
                "unprofitable_sales": 0,
                "clicks_no_sales": 0,
                "no_clicks": 0,
                "wasted_spend": 0,
                "impressions_no_clicks": 0,
                "no_impressions": 0
            }

        impressions = row.get("Impressions", 0)
        clicks = row.get("Clicks", 0)
        spend = row.get("Spend", 0)
        sales = row.get("7 Day Total Sales", 0)

        # ✅ Keep your ACOS calculation
        acos = ((spend / sales) * 100) if sales > 0 else 0

        group = summary[t_type]

        # ======================
        # Aggregations
        # ======================
        group["sales"] += sales
        group["spend"] += spend
        group["total_keywords"] += 1

        # ======================
        # Excel Logic Mapping (FIXED)
        # ======================

        # ✅ Profitable Targets
        # Excel:
        # Match Type = "-"
        # ACOS > 0
        # ACOS <= Target ACOS
        if (
            acos > 0
            and acos <= target_acos
        ):
            group["profitable_keywords"] += 1
            group["profitable_sales"] += sales

        # ✅ Unprofitable Targets
        # Excel:
        # Match Type = "-"
        # ACOS > Target ACOS
        if (
            acos > target_acos
        ):
            group["unprofitable_keywords"] += 1
            group["unprofitable_sales"] += sales

        # ======================
        # Other Excel Conditions
        # ======================

        # Non-Converting Targets
        # Excel: Clicks > 0 AND Sales = 0
        if clicks > 0 and sales == 0:
            group["clicks_no_sales"] += 1

        # Non-Click Targets
        # Excel: Clicks = 0
        if clicks == 0:
            group["no_clicks"] += 1

        # Wasted Spend
        # Excel: Spend > 0 AND Sales = 0
        if spend > 0 and sales == 0:
            group["wasted_spend"] += spend

        # Impressions but no Clicks
        # Excel: Impressions > 0 AND Clicks = 0
        if impressions > 0 and clicks == 0:
            group["impressions_no_clicks"] += 1

        # Targets with no Impressions
        # Excel: Impressions = 0
        if impressions == 0:
            group["no_impressions"] += 1

    # ======================
    # Final ACOS per group
    # ======================
    for t_type in summary:
        sales = summary[t_type]["sales"]
        spend = summary[t_type]["spend"]
        summary[t_type]["acos"] = ((spend / sales) * 100) if sales > 0 else 0
        
    # ======================
    # GRAND TOTALS (EXCLUDE AUTO)
    # ======================
    totals = {
        "profitable_keywords": 0,
        "profitable_sales": 0,
        "unprofitable_keywords": 0,
        "unprofitable_sales": 0,
        "clicks_no_sales": 0,
        "wasted_spend": 0,
        "zero_clicks": 0
    }

    for t_type in summary:
        # ❌ Skip automatic types
        if t_type in ["Automatic Targets", "Automatic Legacy Campaigns"]:
            continue

        totals["profitable_keywords"] += summary[t_type]["profitable_keywords"]
        totals["profitable_sales"] += summary[t_type]["profitable_sales"]
        totals["unprofitable_keywords"] += summary[t_type]["unprofitable_keywords"]
        totals["unprofitable_sales"] += summary[t_type]["unprofitable_sales"]
        totals["clicks_no_sales"] += summary[t_type]["clicks_no_sales"]
        totals["wasted_spend"] += summary[t_type]["wasted_spend"]
        totals["zero_clicks"] += summary[t_type]["no_clicks"]

    summary["TOTALS"] = totals
    
    print("Targeting:")
    print(json.dumps(summary, indent=2))

    return summary
    
def process_search_term_report(df, target_acos):
    result = {}

    # ======================
    # Clean data
    # ======================
    df.columns = df.columns.str.strip()
    df = df.fillna(0)

    # Normalize keyword column
    keyword_col = "Customer Search Term"
    df[keyword_col] = df[keyword_col].astype(str).str.lower().str.strip()

    # ======================
    # ACOS (in % like Excel)
    # ======================
    df["acos"] = ((df["Spend"] / df["7 Day Total Sales"]) * 100).replace([float("inf")], 0)

    # ======================
    # 1. Converting campaigns
    # ======================
    converting = df[df["7 Day Total Sales"] > 0]

    result["converting_below_target_count"] = len(
        converting[converting["acos"] <= target_acos]
    )

    result["converting_above_target_count"] = len(
        converting[converting["acos"] > target_acos]
    )

    # ======================
    # 2. Non-converting campaigns
    # ======================
    result["non_converting_campaigns_count"] = len(
        df[(df["Clicks"] > 0) & (df["7 Day Total Sales"] == 0)]
    )

    # ======================
    # 3. Duplicate Keywords
    # ======================
    duplicates = df[df.duplicated(subset=[keyword_col], keep=False)]

    result["total_duplicate_keywords"] = len(duplicates)
    result["unique_duplicate_keywords"] = duplicates[keyword_col].nunique()

    exact_phrase = df[df["Match Type"].isin(["EXACT", "PHRASE"])]
    ep_duplicates = exact_phrase[
        exact_phrase.duplicated(subset=[keyword_col], keep=False)
    ]

    result["exact_phrase_duplicate_keywords"] = ep_duplicates[keyword_col].nunique()

    # ======================
    # 🔥 TOP 5 METRICS
    # ======================

    # Select required columns
    cols = [
        "Campaign Name",
        "Ad Group Name",
        keyword_col,
        "Clicks",
        "Spend",
        "7 Day Total Sales",
        "acos"
    ]

    # 1. Lowest ACOS Keywords (only converting)
    lowest_acos = converting.sort_values(by="acos").head(5)[cols]

    # 2. Highest ACOS Keywords (only converting)
    highest_acos = converting.sort_values(by="acos", ascending=False).head(5)[cols]

    # 3. Highest Clicks with No Sales
    high_click_no_sales = df[
        (df["Clicks"] > 0) & (df["7 Day Total Sales"] == 0)
    ].sort_values(by="Clicks", ascending=False).head(5)[cols]

    # Convert to JSON
    result["lowest_acos_keywords"] = lowest_acos.to_dict("records")
    result["highest_acos_keywords"] = highest_acos.to_dict("records")
    result["highest_click_no_sales_keywords"] = high_click_no_sales.to_dict("records")
    
    print("Search Term:")
    print(json.dumps(result, indent=2))

    return result
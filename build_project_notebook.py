from __future__ import annotations

from pathlib import Path

import nbformat as nbf


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "notebooks" / "SpaceX_Capstone_Analysis.ipynb"
OUT.parent.mkdir(parents=True, exist_ok=True)


def md(text: str):
    return nbf.v4.new_markdown_cell(text.strip())


def code(text: str):
    return nbf.v4.new_code_cell(text.strip())


cells = [
    md(
        """
# SpaceX Falcon 9 Landing Prediction

**Applied Data Science Capstone — Final Project**

This executed notebook asks whether historical mission, payload, launch-site, orbit,
and booster information can help predict whether the Falcon 9 first stage will land
successfully. It combines data collection, wrangling, visualization, SQL, interactive
analytics, and classification.

> Data scope: IBM Skills Network course snapshots ending in November 2020. Results
> describe this historical snapshot, not current SpaceX operations.
"""
    ),
    code(
        """
from pathlib import Path
import json
import sqlite3

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from IPython.display import HTML, display

ROOT = Path.cwd().resolve().parent
DATA = ROOT / "data"
FIGURES = ROOT / "figures"
SUMMARY = json.loads((ROOT / "analysis_summary.json").read_text())

sns.set_theme(style="whitegrid", context="notebook")
pd.set_option("display.max_columns", 50)
print(f"Project root: {ROOT}")
"""
    ),
    md(
        """
## 1. Executive summary

The workflow collects launch data from the public SpaceX API and Wikipedia, cleans
landing outcomes into a binary target, explores operational patterns, builds Folium
maps and a Plotly Dash dashboard, and compares four classifiers. The historical
sample contains **90 launches** from 2010–2020, of which **60 landed successfully**.
"""
    ),
    code(
        """
summary_table = pd.DataFrame({
    "Metric": ["Launch records", "Successful landings", "Unsuccessful landings", "Overall success rate"],
    "Value": [
        SUMMARY["dataset"]["rows"],
        SUMMARY["dataset"]["successful_landings"],
        SUMMARY["dataset"]["unsuccessful_landings"],
        f'{SUMMARY["dataset"]["overall_success_rate"]:.1f}%'
    ],
})
display(summary_table)
"""
    ),
    md(
        """
## 2. Data collection

Two complementary sources are documented in `src/data_collection.py`:

1. **SpaceX REST API** — request past launches, normalize nested JSON, and retain
   launch, payload, rocket, launchpad, and core identifiers.
2. **Wikipedia web scraping** — parse Falcon 9 launch tables with `pandas.read_html`,
   combine matching tables, and export a flat CSV.

The analysis below uses IBM's frozen course files so every result is reproducible.
"""
    ),
    code(
        """
raw = pd.read_csv(DATA / "dataset_part_1.csv")
clean = pd.read_csv(DATA / "dataset_part_2.csv")
features = pd.read_csv(DATA / "dataset_part_3.csv")
sql_data = pd.read_csv(DATA / "Spacex.csv")
dash_data = pd.read_csv(DATA / "spacex_launch_dash.csv")
geo_data = pd.read_csv(DATA / "spacex_launch_geo.csv")

pd.DataFrame({
    "Dataset": ["API-derived raw", "Wrangled", "Encoded features", "SQL", "Dash", "Folium"],
    "Rows": [len(raw), len(clean), len(features), len(sql_data), len(dash_data), len(geo_data)],
    "Columns": [raw.shape[1], clean.shape[1], features.shape[1], sql_data.shape[1], dash_data.shape[1], geo_data.shape[1]],
})
"""
    ),
    md(
        """
## 3. Data wrangling

Wrangling standardizes dates and numeric payload mass, imputes missing payload mass
with the sample mean, translates landing outcomes into `Class` (1 = success,
0 = unsuccessful), and one-hot encodes launch site, orbit, serial, and grid-fin / leg /
reuse flags for modeling. The checked feature matrix has no missing values.
"""
    ),
    code(
        """
clean["Date"] = pd.to_datetime(clean["Date"])
clean["Year"] = clean["Date"].dt.year
clean["Outcome"] = clean["Class"].map({1: "Successful landing", 0: "Unsuccessful landing"})

wrangling_checks = pd.DataFrame({
    "Check": ["Rows", "Duplicate rows", "Missing values in model features", "Positive target share"],
    "Result": [len(clean), clean.duplicated().sum(), int(features.isna().sum().sum()), f'{clean["Class"].mean():.1%}'],
})
display(wrangling_checks)
display(clean[["FlightNumber", "Date", "BoosterVersion", "PayloadMass", "LaunchSite", "Orbit", "Outcome"]].head())
"""
    ),
    md("## 4. Exploratory data analysis with visualizations"),
    code(
        """
site = clean.groupby("LaunchSite").agg(launches=("Class", "size"), success_rate=("Class", "mean")).sort_values("success_rate")
ax = (site["success_rate"] * 100).plot(kind="barh", figsize=(9, 4.8), color=["#577590", "#43AA8B", "#F4A261"])
ax.set(title="Landing success rate by launch site", xlabel="Successful landings (%)", ylabel="")
ax.set_xlim(0, 100)
for i, value in enumerate(site["success_rate"] * 100):
    ax.text(value + 1, i, f"{value:.1f}%", va="center")
plt.tight_layout()
plt.show()
display(site.assign(success_rate=lambda d: (d.success_rate * 100).round(1)))
"""
    ),
    code(
        """
plt.figure(figsize=(10, 5.5))
sns.scatterplot(data=clean, x="PayloadMass", y="Class", hue="LaunchSite", style="Outcome", s=90)
plt.yticks([0, 1], ["Unsuccessful", "Successful"])
plt.title("Payload mass versus first-stage landing outcome")
plt.xlabel("Payload mass (kg)")
plt.ylabel("Landing outcome")
plt.legend(bbox_to_anchor=(1.02, 1), loc="upper left")
plt.tight_layout()
plt.show()
"""
    ),
    code(
        """
yearly = clean.groupby("Year").agg(launches=("Class", "size"), success_rate=("Class", "mean"))
fig, ax1 = plt.subplots(figsize=(10, 5))
ax1.plot(yearly.index, yearly["success_rate"] * 100, marker="o", linewidth=2.5, color="#F4A261")
ax1.set_ylabel("Success rate (%)", color="#F4A261")
ax1.set_ylim(0, 100)
ax1.set_title("Landing success improved over the historical period")
ax2 = ax1.twinx()
ax2.bar(yearly.index, yearly["launches"], alpha=0.22, color="#17324D")
ax2.set_ylabel("Launches")
plt.tight_layout()
plt.show()
display(yearly.assign(success_rate=lambda d: (d.success_rate * 100).round(1)))
"""
    ),
    code(
        """
orbit = clean.groupby("Orbit").agg(launches=("Class", "size"), success_rate=("Class", "mean"))
orbit = orbit.sort_values(["success_rate", "launches"], ascending=False)
display(orbit.assign(success_rate=lambda d: (d.success_rate * 100).round(1)))
"""
    ),
    md(
        """
## 5. Exploratory data analysis with SQL

The SQL lab uses an in-memory SQLite database to answer operational questions about
launch sites, payload mass, outcomes, dates, and rankings. Representative queries are
executed below rather than copied from a static answer key.
"""
    ),
    code(
        """
con = sqlite3.connect(":memory:")
sql_data.to_sql("SPACEXTBL", con, index=False, if_exists="replace")

queries = {
    "Distinct launch sites": 'SELECT DISTINCT "Launch_Site" FROM SPACEXTBL ORDER BY 1',
    "NASA CRS payload mass": 'SELECT SUM("PAYLOAD_MASS__KG_") AS total_kg FROM SPACEXTBL WHERE "Customer" LIKE "NASA (CRS)%"',
    "First successful ground-pad landing": '''SELECT MIN("Date") AS first_date FROM SPACEXTBL WHERE "Landing_Outcome" = "Success (ground pad)"''',
    "Launch-site ranking": '''SELECT "Launch_Site", COUNT(*) AS launches FROM SPACEXTBL GROUP BY "Launch_Site" ORDER BY launches DESC''',
}
for label, query in queries.items():
    print(f"\\n{label}")
    display(pd.read_sql_query(query, con))
"""
    ),
    code(
        """
pd.read_sql_query(
    '''SELECT "Booster_Version", "Payload", "PAYLOAD_MASS__KG_"
       FROM SPACEXTBL
       WHERE "Landing_Outcome" = "Success (drone ship)"
         AND "PAYLOAD_MASS__KG_" BETWEEN 4000 AND 6000
       ORDER BY "PAYLOAD_MASS__KG_"''',
    con,
)
"""
    ),
    md(
        """
## 6. Interactive visual analytics

The project provides two interactive artifacts:

- **Folium maps** in `figures/`: launch-site markers, clustered landing records, and
  proximity lines to coastline, rail, roadway, and Titusville.
- **Plotly Dash app** in `app/spacex_dash_app.py`: launch-site dropdown, payload-mass
  range slider, success pie chart, and payload-versus-outcome scatter plot.
"""
    ),
    code(
        """
pd.DataFrame(SUMMARY["proximities"]).style.format({"distance_km": "{:.1f} km"})
"""
    ),
    code(
        """
display(HTML('<iframe src="../figures/folium_launch_sites.html" width="100%" height="520"></iframe>'))
"""
    ),
    md("## 7. Predictive analysis"),
    code(
        """
models = pd.DataFrame(SUMMARY["model"]["models"])
metrics = models[["model", "cv_accuracy", "test_accuracy", "precision", "recall", "f1"]].copy()
for column in metrics.columns[1:]:
    metrics[column] = (metrics[column] * 100).round(1)
display(metrics)

ax = metrics.set_index("model")[["cv_accuracy", "test_accuracy"]].plot(
    kind="bar", figsize=(10, 5), color=["#577590", "#F4A261"]
)
ax.set(title="Classifier comparison", ylabel="Accuracy (%)", xlabel="", ylim=(0, 100))
ax.legend(["Cross-validation", "Test"])
plt.xticks(rotation=15, ha="right")
plt.tight_layout()
plt.show()
"""
    ),
    code(
        """
cm = np.array(SUMMARY["model"]["confusion_matrix"])
plt.figure(figsize=(5.8, 4.6))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False,
            xticklabels=["Predicted 0", "Predicted 1"],
            yticklabels=["Actual 0", "Actual 1"])
plt.title(f'Confusion matrix — {SUMMARY["model"]["best_model"]}')
plt.tight_layout()
plt.show()
print("Best model:", SUMMARY["model"]["best_model"])
print("Test split:", SUMMARY["model"]["split"])
"""
    ),
    md(
        """
## 8. Conclusions and limitations

- The historical landing success rate is **66.7%**, with a clear improvement after
  2015 and rates above 80% in 2017, 2019, and 2020.
- KSC LC‑39A has the highest observed site rate (**77.3%**), narrowly ahead of VAFB
  SLC‑4E (**76.9%**); site, orbit, and mission era are therefore useful signals.
- KNN, SVM, and logistic regression each reach **83.3% test accuracy**. KNN is selected
  by higher cross-validation accuracy, not by a unique test-set win.
- The KNN confusion matrix has 12 true positives, 3 true negatives, 3 false positives,
  and no false negatives. This favors recall but may over-predict successful landings.
- The 18-row test set is too small for a strong production claim. A future study should
  use time-aware validation and newer launch data to test whether the relationships
  remain stable.
"""
    ),
    md(
        """
## Sources

- IBM Skills Network Applied Data Science Capstone course datasets
- SpaceX v4 API: https://api.spacexdata.com/v4/launches/past
- Wikipedia: List of Falcon 9 and Falcon Heavy launches
- OpenStreetMap contributors for Folium map tiles
"""
    ),
]

notebook = nbf.v4.new_notebook(
    cells=cells,
    metadata={
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
)
nbf.write(notebook, OUT)
print(OUT)

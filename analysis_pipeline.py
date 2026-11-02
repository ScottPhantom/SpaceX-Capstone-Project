from __future__ import annotations

import json
import math
import sqlite3
from pathlib import Path

import folium
import numpy as np
import pandas as pd
from folium.plugins import MarkerCluster
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
FIGURE_DIR = ROOT / "figures"
FIGURE_DIR.mkdir(parents=True, exist_ok=True)


def json_ready(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if pd.isna(value):
        return None
    raise TypeError(f"Unsupported JSON value: {type(value)!r}")


def records(frame: pd.DataFrame):
    return json.loads(frame.to_json(orient="records", date_format="iso"))


def haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def build_maps(geo: pd.DataFrame):
    center = [geo["Lat"].mean(), geo["Long"].mean()]
    site_map = folium.Map(location=center, zoom_start=4, tiles="OpenStreetMap", control_scale=True)

    sites = geo.groupby("Launch Site", as_index=False).agg(Lat=("Lat", "first"), Long=("Long", "first"), Launches=("Flight Number", "count"))
    for row in sites.itertuples(index=False):
        folium.CircleMarker(
            [row.Lat, row.Long], radius=9, color="#0B3D91", fill=True, fill_color="#2D7DD2",
            fill_opacity=0.9, tooltip=f"{row._0}: {row.Launches} launches",
            popup=f"<b>{row._0}</b><br>{row.Launches} launch records",
        ).add_to(site_map)
    site_map.save(FIGURE_DIR / "folium_launch_sites.html")

    records_map = folium.Map(location=center, zoom_start=4, tiles="OpenStreetMap", control_scale=True)
    cluster = MarkerCluster(name="Launch records").add_to(records_map)
    for row in geo.itertuples(index=False):
        color = "#1B9E77" if int(row._10) == 1 else "#D95F02"
        folium.CircleMarker(
            [row.Lat, row.Long], radius=5, color=color, fill=True, fill_color=color,
            fill_opacity=0.85,
            tooltip=f"Flight {row._0}: {'Success' if int(row._10) == 1 else 'Failure'}",
        ).add_to(cluster)
    folium.LayerControl().add_to(records_map)
    records_map.save(FIGURE_DIR / "folium_launch_records.html")

    ksc = sites[sites["Launch Site"].str.contains("KSC", case=False, na=False)].iloc[0]
    site = (float(ksc["Lat"]), float(ksc["Long"]))
    landmarks = {
        "Atlantic coastline": (28.5735, -80.5750),
        "NASA railway": (28.5780, -80.6540),
        "NASA Causeway": (28.5250, -80.6810),
        "Titusville": (28.6122, -80.8076),
    }
    proximity_map = folium.Map(location=site, zoom_start=11, tiles="OpenStreetMap", control_scale=True)
    folium.Marker(site, tooltip="KSC LC-39A", icon=folium.Icon(color="red", icon="rocket", prefix="fa")).add_to(proximity_map)
    proximities = []
    for label, point in landmarks.items():
        distance = haversine_km(site[0], site[1], point[0], point[1])
        proximities.append({"feature": label, "distance_km": round(distance, 1)})
        folium.Marker(point, tooltip=f"{label}: ~{distance:.1f} km").add_to(proximity_map)
        folium.PolyLine([site, point], color="#2D7DD2", weight=3, opacity=0.75, tooltip=f"~{distance:.1f} km").add_to(proximity_map)
    proximity_map.save(FIGURE_DIR / "folium_proximity.html")
    return sites, proximities


def sql_analysis(sql_data: pd.DataFrame):
    connection = sqlite3.connect(":memory:")
    sql_data.to_sql("SPACEXTBL", connection, index=False, if_exists="replace")
    queries = {
        "launch_sites": 'SELECT DISTINCT "Launch_Site" FROM SPACEXTBL ORDER BY 1',
        "nasa_crs_payload": 'SELECT SUM("PAYLOAD_MASS__KG_") AS total_kg FROM SPACEXTBL WHERE "Customer" LIKE "%NASA (CRS)%"',
        "first_ground_pad_success": 'SELECT MIN("Date") AS first_date FROM SPACEXTBL WHERE "Landing_Outcome" LIKE "Success%ground pad%"',
        "successful_drone_4000_6000": 'SELECT "Booster_Version", "Payload", "PAYLOAD_MASS__KG_" FROM SPACEXTBL WHERE "Landing_Outcome" LIKE "Success%drone ship%" AND "PAYLOAD_MASS__KG_" BETWEEN 4000 AND 6000 ORDER BY "Date"',
        "mission_outcomes": 'SELECT "Mission_Outcome", COUNT(*) AS launches FROM SPACEXTBL GROUP BY "Mission_Outcome" ORDER BY launches DESC',
        "max_payload_boosters": 'SELECT "Booster_Version", "PAYLOAD_MASS__KG_" FROM SPACEXTBL WHERE "PAYLOAD_MASS__KG_" = (SELECT MAX("PAYLOAD_MASS__KG_") FROM SPACEXTBL)',
        "2015_failures": 'SELECT "Landing_Outcome", COUNT(*) AS launches FROM SPACEXTBL WHERE substr("Date",1,4)="2015" AND "Landing_Outcome" LIKE "Failure%" GROUP BY "Landing_Outcome" ORDER BY launches DESC',
        "site_ranking": 'SELECT "Launch_Site", COUNT(*) AS launches FROM SPACEXTBL GROUP BY "Launch_Site" ORDER BY launches DESC',
    }
    output = {}
    for name, query in queries.items():
        output[name] = records(pd.read_sql_query(query, connection))
    connection.close()
    return output


def model_analysis(features: pd.DataFrame, labels: pd.Series):
    x_train, x_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.20, random_state=2
    )
    models = {
        "Logistic regression": (
            Pipeline([("scale", StandardScaler()), ("model", LogisticRegression(max_iter=3000, random_state=2))]),
            {"model__C": [0.01, 0.1, 1, 10]},
        ),
        "Support vector machine": (
            Pipeline([("scale", StandardScaler()), ("model", SVC(random_state=2))]),
            {"model__C": [0.5, 1, 2], "model__kernel": ["linear", "rbf", "sigmoid"]},
        ),
        "Decision tree": (
            DecisionTreeClassifier(random_state=2),
            {"criterion": ["gini", "entropy"], "max_depth": [2, 4, 6, 8], "min_samples_leaf": [1, 2, 4]},
        ),
        "K-nearest neighbors": (
            Pipeline([("scale", StandardScaler()), ("model", KNeighborsClassifier())]),
            {"model__n_neighbors": list(range(3, 11)), "model__weights": ["uniform", "distance"], "model__p": [1, 2]},
        ),
    }
    results = []
    predictions = {}
    estimators = {}
    for name, (estimator, params) in models.items():
        search = GridSearchCV(estimator, params, cv=5, scoring="accuracy", n_jobs=-1)
        search.fit(x_train, y_train)
        pred = search.predict(x_test)
        predictions[name] = pred
        estimators[name] = search.best_estimator_
        results.append({
            "model": name,
            "cv_accuracy": round(float(search.best_score_), 4),
            "test_accuracy": round(float(accuracy_score(y_test, pred)), 4),
            "precision": round(float(precision_score(y_test, pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, pred, zero_division=0)), 4),
            "best_params": search.best_params_,
        })
    results.sort(key=lambda item: (item["test_accuracy"], item["f1"], item["cv_accuracy"]), reverse=True)
    best = results[0]["model"]
    matrix = confusion_matrix(y_test, predictions[best]).tolist()
    return {
        "split": {"train_rows": int(len(x_train)), "test_rows": int(len(x_test)), "random_state": 2},
        "models": results,
        "best_model": best,
        "confusion_matrix": matrix,
        "test_labels": y_test.tolist(),
        "best_predictions": predictions[best].tolist(),
    }


def main():
    data = pd.read_csv(DATA_DIR / "dataset_part_2.csv")
    data["Date"] = pd.to_datetime(data["Date"])
    data["Year"] = data["Date"].dt.year
    features = pd.read_csv(DATA_DIR / "dataset_part_3.csv")
    sql_data = pd.read_csv(DATA_DIR / "Spacex.csv")
    geo = pd.read_csv(DATA_DIR / "spacex_launch_geo.csv")

    site_success = (
        data.groupby("LaunchSite").agg(launches=("Class", "size"), success_rate=("Class", "mean"))
        .reset_index().sort_values("success_rate", ascending=False)
    )
    site_success["success_rate"] = (site_success["success_rate"] * 100).round(1)

    orbit_success = (
        data.groupby("Orbit").agg(launches=("Class", "size"), success_rate=("Class", "mean"))
        .reset_index().sort_values(["success_rate", "launches"], ascending=[False, False])
    )
    orbit_success["success_rate"] = (orbit_success["success_rate"] * 100).round(1)

    year_success = (
        data.groupby("Year").agg(launches=("Class", "size"), success_rate=("Class", "mean"))
        .reset_index().sort_values("Year")
    )
    year_success["success_rate"] = (year_success["success_rate"] * 100).round(1)

    sites, proximities = build_maps(geo)
    sql_results = sql_analysis(sql_data)
    model_results = model_analysis(features, data["Class"])

    payload_scatter = data[["FlightNumber", "PayloadMass", "LaunchSite", "Orbit", "Class"]].copy()
    payload_scatter["Outcome"] = payload_scatter["Class"].map({1: "Successful landing", 0: "Unsuccessful landing"})

    summary = {
        "dataset": {
            "rows": int(len(data)),
            "columns": int(data.shape[1]),
            "date_min": data["Date"].min().date().isoformat(),
            "date_max": data["Date"].max().date().isoformat(),
            "overall_success_rate": round(float(data["Class"].mean() * 100), 1),
            "successful_landings": int(data["Class"].sum()),
            "unsuccessful_landings": int((1 - data["Class"]).sum()),
        },
        "site_success": records(site_success),
        "orbit_success": records(orbit_success),
        "year_success": records(year_success),
        "payload_scatter": records(payload_scatter),
        "launch_sites": records(sites),
        "proximities": proximities,
        "sql": sql_results,
        "model": model_results,
    }
    (ROOT / "analysis_summary.json").write_text(json.dumps(summary, indent=2, default=json_ready), encoding="utf-8")
    print(json.dumps({
        "dataset": summary["dataset"],
        "best_model": model_results["best_model"],
        "model_results": model_results["models"],
        "site_success": summary["site_success"],
    }, indent=2))


if __name__ == "__main__":
    main()

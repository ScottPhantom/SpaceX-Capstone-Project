# SpaceX Falcon 9 Landing Prediction

Applied Data Science Capstone project for the IBM Data Science Professional Certificate.

## Business question

Can historical mission, payload, launch-site, orbit, and booster information help predict whether the Falcon 9 first stage will land successfully?

## Project workflow

1. Collect Falcon 9 launch records through the SpaceX API and a Wikipedia table.
2. Clean landing outcomes and derive a binary `Class` target.
3. Explore launch-site, orbit, payload, and yearly trends using visualizations and SQL.
4. Map launch sites, launch outcomes, and nearby infrastructure with Folium.
5. Build a Plotly Dash application for interactive site and payload analysis.
6. Compare logistic regression, support vector machine, decision tree, and K-nearest-neighbor classifiers.

## Reproducible result

The IBM course snapshot contains 90 Falcon 9 launches between June 2010 and November 2020. Sixty launches have a successful first-stage landing (`Class = 1`), giving an overall success rate of 66.7%.

With an 80/20 split using `random_state=2`, K-nearest neighbors, support vector machine, and logistic regression each reached 83.3% test accuracy in the included analysis run. KNN ranked first after the tie-break on cross-validation accuracy. The small 18-row test set limits the strength of model comparisons.

## Repository contents

- `notebooks/SpaceX_Capstone_Analysis.ipynb` - executed analysis notebook
- `app/spacex_dash_app.py` - interactive Plotly Dash application
- `src/data_collection.py` - API and web-scraping workflow
- `data/` - IBM course datasets used for the analysis
- `figures/` - Folium maps and presentation images
- `report/` - final presentation files
- `analysis_summary.json` - machine-readable results used in the report

## Run locally

```bash
python -m pip install -r requirements.txt
jupyter notebook notebooks/SpaceX_Capstone_Analysis.ipynb
python app/spacex_dash_app.py
```

The Dash application runs at `http://127.0.0.1:8050/`.

## Data provenance

The project uses educational datasets published by IBM Skills Network for the Applied Data Science Capstone. The API workflow references the public SpaceX v4 API, and the map uses OpenStreetMap tiles through Folium.


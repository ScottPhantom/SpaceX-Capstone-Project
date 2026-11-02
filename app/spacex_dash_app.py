from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
from dash import Dash, Input, Output, dcc, html


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "spacex_launch_dash.csv"
data = pd.read_csv(DATA_PATH)
sites = sorted(data["Launch Site"].dropna().unique().tolist())
payload_min = float(data["Payload Mass (kg)"].min())
payload_max = float(data["Payload Mass (kg)"].max())

app = Dash(__name__)
app.title = "SpaceX Launch Outcome Dashboard"

app.layout = html.Div(
    style={"maxWidth": "1300px", "margin": "0 auto", "fontFamily": "Arial", "padding": "24px"},
    children=[
        html.H1("SpaceX Launch Outcome Dashboard", style={"color": "#17324D"}),
        html.P("Explore first-stage landing success by launch site and payload mass."),
        html.Label("Launch site"),
        dcc.Dropdown(
            id="site-dropdown",
            options=[{"label": "All sites", "value": "ALL"}]
            + [{"label": site, "value": site} for site in sites],
            value="ALL",
            clearable=False,
        ),
        html.Label("Payload mass range (kg)", style={"display": "block", "marginTop": "18px"}),
        dcc.RangeSlider(
            id="payload-slider", min=payload_min, max=payload_max, step=100,
            value=[payload_min, payload_max],
            marks={int(value): str(int(value)) for value in [payload_min, 2500, 5000, 7500, payload_max]},
        ),
        html.Div(
            style={"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "20px", "marginTop": "24px"},
            children=[dcc.Graph(id="success-pie-chart"), dcc.Graph(id="payload-scatter-chart")],
        ),
    ],
)


@app.callback(
    Output("success-pie-chart", "figure"),
    Output("payload-scatter-chart", "figure"),
    Input("site-dropdown", "value"),
    Input("payload-slider", "value"),
)
def update_dashboard(selected_site: str, payload_range):
    low, high = payload_range
    filtered = data[data["Payload Mass (kg)"].between(low, high)].copy()
    if selected_site != "ALL":
        filtered = filtered[filtered["Launch Site"] == selected_site]

    counts = filtered["class"].value_counts().reindex([1, 0], fill_value=0)
    pie = px.pie(
        values=counts.values, names=["Successful landing", "Unsuccessful landing"],
        title=f"Landing outcomes: {selected_site if selected_site != 'ALL' else 'all sites'}",
        color_discrete_sequence=["#2A9D8F", "#E76F51"], hole=0.35,
    )
    scatter = px.scatter(
        filtered, x="Payload Mass (kg)", y="class", color="Booster Version Category",
        symbol="Launch Site", hover_data=["Flight Number", "Launch Site", "Booster Version"],
        title="Payload mass versus first-stage landing outcome",
        labels={"class": "Landing class (1 = success)"},
    )
    scatter.update_layout(template="plotly_white")
    pie.update_layout(template="plotly_white")
    return pie, scatter


if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=8050)


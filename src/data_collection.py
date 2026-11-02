"""Data-collection examples for the SpaceX capstone project."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import requests


SPACEX_API = "https://api.spacexdata.com/v4/launches/past"
WIKIPEDIA_FALCON9 = "https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches"


def collect_api_launches() -> pd.DataFrame:
    """Return raw past-launch records from the public SpaceX v4 API."""
    response = requests.get(SPACEX_API, timeout=30)
    response.raise_for_status()
    return pd.json_normalize(response.json())


def scrape_launch_tables() -> pd.DataFrame:
    """Combine the Falcon 9 launch tables published on Wikipedia."""
    tables = pd.read_html(WIKIPEDIA_FALCON9)
    launch_tables = [table for table in tables if "Flight No." in table.columns.astype(str).tolist()]
    if not launch_tables:
        raise RuntimeError("No Falcon 9 launch tables were detected.")
    return pd.concat(launch_tables, ignore_index=True)


def main(output_dir: str = "data/raw") -> None:
    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    collect_api_launches().to_json(target / "spacex_api_launches.json", orient="records", indent=2)
    scrape_launch_tables().to_csv(target / "spacex_wikipedia_launches.csv", index=False)


if __name__ == "__main__":
    main()


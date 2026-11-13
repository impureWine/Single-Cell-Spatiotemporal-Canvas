# filepath: backend/export_scvelo_to_json.py
"""Export the six supported pancreas populations to the CellFlow JSON contract."""
import argparse
import json
import os
from pathlib import Path
import tempfile

import numpy as np
import pandas as pd
import scanpy as sc
import scvelo as scv
from scipy import sparse

GENES = ["Sox9", "Neurog3", "Ins1", "Gcg"]
CLUSTERS = ["Ductal", "Ngn3_low_EP", "Ngn3_high_EP", "Pre_endocrine", "Beta", "Alpha"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("pancreas_cells.json"))
    parser.add_argument("--spatial-csv", type=Path, help="CSV columns: id, spatialX, spatialY")
    parser.add_argument("--umap-as-spatial", action="store_true", help="Explicitly reuse UMAP for a demonstration spatial view")
    args = parser.parse_args()
    if bool(args.spatial_csv) == args.umap_as_spatial:
        parser.error("Choose exactly one of --spatial-csv or --umap-as-spatial")

    np.random.seed(42)
    adata = scv.datasets.pancreas()
    adata = adata[adata.obs["clusters"].astype(str).isin(CLUSTERS)].copy()
    if not adata.obs_names.is_unique:
        raise ValueError("Cell IDs must be unique")
    missing = set(GENES) - set(adata.var_names)
    if missing:
        raise ValueError(f"Missing genes: {sorted(missing)}")

    # Normalize with full transcriptome library sizes before selecting marker columns.
    full = adata.copy()
    sc.pp.normalize_total(full, target_sum=10000)
    sc.pp.log1p(full)
    marker_values = full[:, GENES].X
    marker_values = marker_values.toarray() if sparse.issparse(marker_values) else np.asarray(marker_values)
    del full

    scv.pp.filter_and_normalize(adata, min_shared_counts=20, n_top_genes=2000)
    sc.pp.pca(adata, n_comps=30, random_state=42)
    sc.pp.neighbors(adata, n_neighbors=30, n_pcs=30, random_state=42)
    scv.pp.moments(adata, n_pcs=30, n_neighbors=30)
    scv.tl.velocity(adata, mode="stochastic")
    scv.tl.velocity_graph(adata, n_jobs=1)
    scv.tl.velocity_pseudotime(adata)
    scv.tl.velocity_embedding(adata, basis="umap")
    umap = np.asarray(adata.obsm["X_umap"])[:, :2]
    velocity = np.asarray(adata.obsm["velocity_umap"])[:, :2]
    times = np.asarray(adata.obs["velocity_pseudotime"], dtype=float)

    if args.spatial_csv:
        table = pd.read_csv(args.spatial_csv, dtype={"id": str})
        if not {"id", "spatialX", "spatialY"}.issubset(table.columns) or table["id"].duplicated().any():
            raise ValueError("Spatial CSV needs unique id, spatialX, spatialY columns")
        spatial = table.set_index("id").reindex(adata.obs_names)[["spatialX", "spatialY"]].to_numpy(dtype=float)
    else:
        spatial = umap.copy()
        print("Spatial coordinates reuse UMAP for demonstration. They are not measured tissue coordinates.")

    arrays = [umap, velocity, spatial, times, marker_values]
    if not all(np.isfinite(array).all() for array in arrays):
        raise ValueError("Nonfinite output values detected")
    if (times < 0).any() or (times > 1).any():
        raise ValueError("Pseudotime is outside [0, 1]")

    records = [
        {
            "id": str(adata.obs_names[i]),
            "cluster": str(adata.obs["clusters"].iloc[i]),
            "spatialX": float(spatial[i, 0]), "spatialY": float(spatial[i, 1]),
            "umapX": float(umap[i, 0]), "umapY": float(umap[i, 1]),
            "pseudotime": float(times[i]),
            "velocityU": float(velocity[i, 0]), "velocityV": float(velocity[i, 1]),
            "genes": {gene: float(marker_values[i, j]) for j, gene in enumerate(GENES)},
        }
        for i in range(adata.n_obs)
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.output.parent, delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(records, handle, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        os.replace(temporary, args.output)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    print(f"Exported {len(records)} cells to {args.output}")


if __name__ == "__main__":
    main()

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_absolute_error, root_mean_squared_error, r2_score
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_and_evaluate():
    print("=" * 60)
    print("INDUSTRIAL DIGITAL TWIN - ML TRAINING PIPELINE")
    print("=" * 60)

    # 1. Train Anomaly Detection (Isolation Forest)
    print("\n[1/3] Training Anomaly Detector (Isolation Forest)...")
    np.random.seed(42)
    n_normal = 2000
    X_anomaly = np.column_stack([
        np.random.normal(0.45, 0.08, n_normal),  # vib rms
        np.random.normal(55.0, 4.0, n_normal),   # temp
        np.random.normal(7.5, 0.8, n_normal),    # current
        np.random.normal(1485.0, 5.0, n_normal), # rpm
        np.random.normal(4.8, 0.6, n_normal),    # power
        np.random.normal(3.0, 0.2, n_normal),    # kurtosis
        np.random.normal(2.5, 0.2, n_normal),    # crest factor
    ])
    anomaly_model = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    anomaly_model.fit(X_anomaly)
    joblib.dump(anomaly_model, os.path.join(MODELS_DIR, "anomaly_model.pkl"))
    print("  ✓ Anomaly model saved to models/anomaly_model.pkl")

    # 2. Train Fault Classifier (Random Forest)
    print("\n[2/3] Training Fault Classifier (Random Forest Multi-Class)...")
    from backend.ml.classifier import FaultClassifier, FAULT_CLASSES
    clf_helper = FaultClassifier()
    X_clf, y_clf = clf_helper._generate_synthetic_training_data()
    
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X_clf, y_clf, test_size=0.25, random_state=42, stratify=y_clf
    )
    
    clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    clf.fit(X_train_c, y_train_c)
    y_pred_c = clf.predict(X_test_c)

    acc = accuracy_score(y_test_c, y_pred_c)
    prec = precision_score(y_test_c, y_pred_c, average="weighted")
    rec = recall_score(y_test_c, y_pred_c, average="weighted")
    f1 = f1_score(y_test_c, y_pred_c, average="weighted")
    cm = confusion_matrix(y_test_c, y_pred_c)

    print(f"  Classification Metrics:")
    print(f"    - Accuracy:  {acc * 100:.2f}%")
    print(f"    - Precision: {prec * 100:.2f}%")
    print(f"    - Recall:    {rec * 100:.2f}%")
    print(f"    - F1 Score:  {f1 * 100:.2f}%")
    print("    - Confusion Matrix:\n", cm)
    
    joblib.dump(clf, os.path.join(MODELS_DIR, "fault_classifier.pkl"))
    print("  ✓ Fault classifier saved to models/fault_classifier.pkl")

    # 3. Train RUL Regressor
    print("\n[3/3] Training Remaining Useful Life (RUL) Regressor...")
    from backend.ml.rul import RULPredictor
    rul_helper = RULPredictor()
    X_rul, y_rul = rul_helper._generate_synthetic_rul_data()
    
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X_rul, y_rul, test_size=0.2, random_state=42
    )
    
    reg = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    reg.fit(X_train_r, y_train_r)
    y_pred_r = reg.predict(X_test_r)

    mae = mean_absolute_error(y_test_r, y_pred_r)
    rmse = root_mean_squared_error(y_test_r, y_pred_r)
    r2 = r2_score(y_test_r, y_pred_r)

    print(f"  Regression Metrics:")
    print(f"    - MAE:  {mae:.2f} hours")
    print(f"    - RMSE: {rmse:.2f} hours")
    print(f"    - R²:   {r2:.4f}")

    joblib.dump(reg, os.path.join(MODELS_DIR, "rul_model.pkl"))
    print("  ✓ RUL model saved to models/rul_model.pkl")

    # Save summary metadata
    metrics_summary = {
        "classification": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "classes": FAULT_CLASSES
        },
        "regression": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4)
        }
    }
    joblib.dump(metrics_summary, os.path.join(MODELS_DIR, "metrics.pkl"))
    print("\nTraining completed successfully! All models stored in models/.")

if __name__ == "__main__":
    train_and_evaluate()

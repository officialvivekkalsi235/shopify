import { useEffect, useState } from "react";

function PincodeSettings() {
  const [pincodes, setPincodes] = useState([]);
  const [newPincode, setNewPincode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ========================================
  // LOAD SETTINGS
  // ========================================

  const loadSettings = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/settings");

      const data = await response.json();

      if (response.ok) {
        setPincodes(data.settings?.blockedPincodes || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // ========================================
  // ADD PINCODE
  // ========================================

  const addPincode = () => {
    const clean = newPincode.trim();

    if (!/^\d{6}$/.test(clean)) {
      setMessage("Enter a valid 6 digit pincode");
      return;
    }

    if (pincodes.includes(clean)) {
      setMessage("Pincode already exists");
      return;
    }

    setPincodes([...pincodes, clean]);

    setNewPincode("");
    setMessage("");
  };

  // ========================================
  // REMOVE PINCODE
  // ========================================

  const removePincode = (pincode) => {
    setPincodes(pincodes.filter((item) => item !== pincode));
  };

  // ========================================
  // SAVE SETTINGS
  // ========================================

  const saveSettings = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "http://localhost:5000/api/settings/pincodes",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            blockedPincodes: pincodes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to save settings");
        return;
      }

      setPincodes(data.settings.blockedPincodes);

      setMessage("Settings saved successfully");
    } catch (error) {
      setMessage("Unable to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-icon">⛔</div>

          <div>
            <h2>COD Pincode Blocklist</h2>

            <p>
              Prevent customers from selected pincodes from placing Cash on
              Delivery orders.
            </p>
          </div>
        </div>

        <div className="settings-info">
          <div>
            <span className="info-label">Blocked pincodes</span>

            <strong>{pincodes.length}</strong>
          </div>

          <span className="status-pill">Active</span>
        </div>

        <div className="settings-section">
          <label className="settings-label">Add a blocked pincode</label>

          <div className="pincode-input-row">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6 digit pincode"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addPincode();
                }
              }}
            />

            <button
              type="button"
              className="add-pincode-button"
              onClick={addPincode}
            >
              + Add
            </button>
          </div>

          <span className="settings-help-text">Example: 145001</span>
        </div>

        <div className="settings-section">
          <div className="blocked-header">
            <div>
              <h3>Blocked Pincodes</h3>

              <p>COD will not be available for these locations.</p>
            </div>
          </div>

          {pincodes.length === 0 ? (
            <div className="empty-pincode-state">
              <div className="empty-icon">📍</div>

              <strong>No blocked pincodes</strong>

              <p>Add a pincode above to restrict Cash on Delivery.</p>
            </div>
          ) : (
            <div className="pincode-list">
              {pincodes.map((pincode) => (
                <div className="pincode-list-item" key={pincode}>
                  <div className="pincode-value">
                    <span className="pin-icon">📍</span>

                    <div>
                      <strong>{pincode}</strong>

                      <span>COD blocked</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="remove-pincode-button"
                    onClick={() => removePincode(pincode)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <div
            className={
              message.includes("successfully")
                ? "settings-message success"
                : "settings-message error"
            }
          >
            {message}
          </div>
        )}

        <div className="settings-footer">
          <div className="settings-footer-text">
            Changes will affect the storefront after saving.
          </div>

          <button
            type="button"
            className="save-settings-button"
            onClick={saveSettings}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PincodeSettings;

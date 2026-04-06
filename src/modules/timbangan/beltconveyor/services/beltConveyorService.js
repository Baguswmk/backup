import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = "/v1/custom/belt-conveyor-tonnage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const extractErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Terjadi kesalahan";

const unwrapList = (response) => {
  const body = response?.data ?? response;
  return {
    items: Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [],
    meta: body?.meta ?? null,
  };
};

const unwrapOne = (response) => {
  const body = response?.data ?? response;
  return body?.data ?? body ?? null;
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Belt Conveyor Tonnage Service
 *
 * Backend routes: /v1/custom/belt-conveyor-tonnage
 *
 * Response shape:
 *   GET list  → { success, data: [...], meta: { total } }
 *   GET one   → { success, data: { ...record } }   (populated relations)
 *   POST/PUT  → { success, data: { ...record } }
 *
 * Query filters:
 *   Scalar : loader, hauler, measurement_type, status
 *   Date   : dateFrom, dateTo (YYYY-MM-DD)
 *   Relation: loading_point, dumping_point, coal_type (matched by name on BE)
 *
 * ⚠️  delta = tonnage − beltscale is computed entirely in the FE.
 *      The backend stores it as-is — never re-calculates it.
 *
 * Konvensi field (berlaku di semua modal):
 *   formData.tonnage   = "Beltscale Saat Ini"  → nilai kumulatif yang user input
 *   formData.beltscale = "Beltscale Sebelumnya" → nilai kumulatif record sebelumnya
 *   delta (computed)   = formData.tonnage - formData.beltscale
 *
 *   payload.beltscale  = formData.tonnage   (kumulatif terkini → disimpan di DB)
 *   payload.tonnage    = delta              (selisih / produksi riil → disimpan di DB)
 *   payload.delta      = delta              (field redundan, sama dengan tonnage)
 */
export const beltConveyorService = {
  // ── GET list ──────────────────────────────────────────────────────────────

  /**
   * Fetch paginated / filtered list.
   *
   * @param {Object}  opts
   * @param {Object}  opts.params   Key-value query params (undefined/null/"All" are skipped)
   */
  async fetchData({ params = {} } = {}) {
    try {
      // Build query string, skip empty/null/"All" values
      const entries = Object.entries(params).filter(
        ([, v]) => v != null && v !== "" && v !== "All",
      );
      const queryString = entries.length
        ? new URLSearchParams(entries).toString()
        : "";

      const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

      logger.info("🔍 [BeltConveyor] fetchData", { params });

      const response = await offlineService.get(url, { forceRefresh: true });
      const { items, meta } = unwrapList(response);

      logger.info(`✅ [BeltConveyor] fetchData — ${items.length} records`, { meta });

      return { success: true, data: items, meta };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] fetchData failed", {
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, data: [], error: errorMessage };
    }
  },

  // ── GET latest per loader ────────────────────────────────────────────────

  /**
   * Fetch the latest tonnage record per loader.
   * Used to pre-fill the "Beltscale Sebelumnya" field in the Tambah modal.
   *
   * Always bypasses cache (forceRefresh) so the value is current.
   *
   * @param {string[]} loaders  e.g. ["Loader A", "Loader B"]
   */
  async fetchLatestPerLoader(loaders = []) {
    try {
      if (!loaders.length) {
        logger.warn("⚠️ [BeltConveyor] fetchLatestPerLoader: no loaders given");
        return { success: true, data: [] };
      }

      const url = `/v1/custom/setting-belt-conveyor`;

      logger.info("🔍 [BeltConveyor] fetchLatestPerLoader", { loaders });

      const response = await offlineService.get(url, { forceRefresh: true });
      const { items } = unwrapList(response);

      const validItems = items.filter(Boolean);

      logger.info(`✅ [BeltConveyor] fetchLatestPerLoader — ${validItems.length} records`);

      return { success: true, data: validItems };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] fetchLatestPerLoader failed", {
        error: errorMessage,
        loaders,
      });
      return { success: false, data: [], error: errorMessage };
    }
  },

  // ── GET by ID ─────────────────────────────────────────────────────────────

  /**
   * Fetch a single record by ID (populated relations).
   *
   * @param {string|number} id
   */
  async fetchById(id) {
    try {
      logger.info("🔍 [BeltConveyor] fetchById", { id });

      const response = await offlineService.get(`${BASE_URL}/${id}`);
      const data = unwrapOne(response);

      logger.info("✅ [BeltConveyor] fetchById", { id });

      return { success: true, data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] fetchById failed", {
        id,
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, data: null, error: errorMessage };
    }
  },

  // ── POST (create) ─────────────────────────────────────────────────────────

  /**
   * Create a new Belt Conveyor Tonnage record.
   *
   * ⚠️  Payload MUST include pre-computed `delta` (tonnage − beltscale).
   *     Relation fields: coal_type, loading_point, dumping_point (IDs, no "_id" suffix).
   *
   * @param {Object} payload
   */
  async createData(payload) {
    try {
      logger.info("📡 [BeltConveyor] createData", {
        loader: payload.loader,
        shift: payload.shift,
        group: payload.group,
        tonnage: payload.tonnage,
      });

      const response = await offlineService.post(BASE_URL, payload);
      const data = unwrapOne(response);

      logger.info("✅ [BeltConveyor] createData success");

      return { success: true, data };
    } catch (error) {
      // Offline queue — treat as soft success
      const isQueued =
        error?.message?.includes("queued") ||
        error?.message?.includes("offline sync");
      if (isQueued) {
        logger.info("📤 [BeltConveyor] createData queued (offline)");
        return { success: true, queued: true, offline: true };
      }

      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] createData failed", {
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ── PUT (update) ──────────────────────────────────────────────────────────

  /**
   * Update an existing record.
   *
   * ⚠️  Payload MUST include re-computed `delta`.
   *
   * @param {string|number} id
   * @param {Object}        payload
   */
  async updateData(id, payload) {
    try {
      logger.info("📡 [BeltConveyor] updateData", {
        id,
        loader: payload.loader,
        shift: payload.shift,
        group: payload.group,
        tonnage: payload.tonnage,
      });

      const response = await offlineService.put(`${BASE_URL}/${id}`, payload);
      const data = unwrapOne(response);

      logger.info("✅ [BeltConveyor] updateData success", { id });

      return { success: true, data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] updateData failed", {
        id,
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ── DELETE ────────────────────────────────────────────────────────────────

  /**
   * Delete a record (soft-delete on BE side).
   *
   * @param {string|number} id
   */
  async deleteData(id) {
    try {
      logger.info("🗑️ [BeltConveyor] deleteData", { id });

      const response = await offlineService.delete(`${BASE_URL}/${id}`);

      logger.info("✅ [BeltConveyor] deleteData success", { id });

      return { success: true, data: response?.data ?? response };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] deleteData failed", {
        id,
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ── PATCH setting (coal_type) ───────────────────────────────────────────────

  /**
   * Update the setting-belt-conveyor record (e.g. change coal_type).
   * Calls PATCH /v1/custom/setting-belt-conveyor/:id
   *
   * @param {string|number} id      - setting-belt-conveyor ID
   * @param {Object}        payload - e.g. { coal_type: <id> }
   */
  async updateSetting(id, payload) {
    try {
      logger.info("📡 [BeltConveyor] updateSetting", { id, payload });

      const response = await offlineService.patch(
        `/v1/custom/setting-belt-conveyor/${id}`,
        payload,
      );
      const data = unwrapOne(response);

      logger.info("✅ [BeltConveyor] updateSetting success", { id });

      return { success: true, data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] updateSetting failed", {
        id,
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },

  // ── POST setting (create baru) ─────────────────────────────────────────────

  /**
   * Buat setting-belt-conveyor baru jika belum ada.
   * Calls POST /v1/custom/setting-belt-conveyor
   *
   * @param {Object} payload
   *   hauler    : hull_no string atau numeric ID hauler
   *   loader    : hull_no string atau numeric ID loader
   *   coal_type : numeric ID coal_type
   */
  async createSetting(payload) {
    try {
      logger.info("📡 [BeltConveyor] createSetting", { payload });

      const response = await offlineService.post(
        "/v1/custom/setting-belt-conveyor",
        payload,
      );
      const data = unwrapOne(response);

      logger.info("✅ [BeltConveyor] createSetting success");

      return { success: true, data };
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      logger.error("❌ [BeltConveyor] createSetting failed", {
        error: errorMessage,
        details: error?.response?.data,
      });
      return { success: false, error: errorMessage };
    }
  },
};
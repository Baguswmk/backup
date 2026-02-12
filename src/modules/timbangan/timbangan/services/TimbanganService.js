import { offlineService } from "@/shared/services/offlineService";
import { showToast } from "@/shared/utils/toast";

export const timbanganService = {

  createTimbangan: async (data) => {
    try {
      const result = await offlineService.post("/v1/custom/ritase/offline", data);
      
      return result;
    } catch (error) {
      console.error("❌ Create timbangan error:", error);
      throw error;
    }
  },
};

import { useState, useEffect } from "react";
import type { DemandPrintOrderRow } from "../interface/DemandPrintOrder";
import apiService from "../../../../services/api";

export const useDemandPrintOrder = () => {
  const [rows, setRows] = useState<DemandPrintOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDemandPrintOrder();
      if (response.success) {
        // Handle potential double-wrapping from TransformInterceptor
        let data = response.data;
        if (data && !Array.isArray(data) && Array.isArray((data as any).data)) {
          data = (data as any).data;
        }
        if (Array.isArray(data)) {
          setRows(data);
        } else {
          setRows([]);
        }
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error fetching demand print order:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRows = async (updatedRows: DemandPrintOrderRow[]) => {
    try {
      const response = await apiService.saveDemandPrintOrder(updatedRows);
      return response.success;
    } catch (error) {
      console.error('Error saving demand print order:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  return { rows, setRows, loading, saveRows, refresh: fetchRows };
};

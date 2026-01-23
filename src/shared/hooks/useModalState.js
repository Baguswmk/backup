import { useState, useCallback } from "react";

export const useModalState = (defaultStates = {}) => {
  const [modals, setModals] = useState(
    Object.keys(defaultStates).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {})
  );
  
  const [modalData, setModalData] = useState(
    Object.keys(defaultStates).reduce((acc, key) => {
      acc[key] = defaultStates[key];
      return acc;
    }, {})
  );

  const openModal = useCallback((modalName, data = null) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
    if (data !== null) {
      setModalData((prev) => ({ ...prev, [modalName]: data }));
    }
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setModalData((prev) => ({ ...prev, [modalName]: null }));
  }, []);

  const getModalState = useCallback(
    (modalName) => ({
      isOpen: modals[modalName] || false,
      data: modalData[modalName],
    }),
    [modals, modalData]
  );

  return {
    modals,
    modalData,
    openModal,
    closeModal,
    getModalState,
  };
};

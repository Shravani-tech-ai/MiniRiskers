import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const LAST_REQUEST_KEY = "lastChangeRequestId";

const AssessmentWorkflowContext = createContext(null);

const EMPTY_WORKFLOW = {
  changeRequestId: null,
  activeView: null,
  from: null,
};

export function AssessmentWorkflowProvider({ children }) {
  const [workflow, setWorkflowState] = useState(EMPTY_WORKFLOW);

  const setWorkflow = useCallback((next) => {
    setWorkflowState((current) => ({ ...current, ...next }));
  }, []);

  const clearWorkflow = useCallback(() => {
    setWorkflowState(EMPTY_WORKFLOW);
    sessionStorage.removeItem(LAST_REQUEST_KEY);
  }, []);

  const value = useMemo(
    () => ({
      workflow,
      setWorkflow,
      clearWorkflow,
    }),
    [workflow, setWorkflow, clearWorkflow]
  );

  return (
    <AssessmentWorkflowContext.Provider value={value}>
      {children}
    </AssessmentWorkflowContext.Provider>
  );
}

export function useAssessmentWorkflow() {
  const context = useContext(AssessmentWorkflowContext);
  if (!context) {
    throw new Error(
      "useAssessmentWorkflow must be used within AssessmentWorkflowProvider"
    );
  }
  return context;
}

/**
 * Hook de toasts — notificações temporárias (shadcn/ui).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa de react
import * as React from "react";

// Importa funções/componentes de @/components/ui/toast
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Constante local
const TOAST_LIMIT = 1;
// Constante local
const TOAST_REMOVE_DELAY = 1000000;

// Define formato de dados (TypeScript)
type ToasterToast = ToastProps & {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  title?: React.ReactNode;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description?: React.ReactNode;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  action?: ToastActionElement;
};

// Constante local
const actionTypes = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ADD_TOAST: "ADD_TOAST",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  UPDATE_TOAST: "UPDATE_TOAST",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DISMISS_TOAST: "DISMISS_TOAST",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  REMOVE_TOAST: "REMOVE_TOAST",
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} as const;

// Variável mutável local
let count = 0;

// Declara função auxiliar interna
function genId() {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  // Retorna valor ou JSX para quem chamou
  return count.toString();
}

// Define formato de dados (TypeScript)
type ActionType = typeof actionTypes;

// Define formato de dados (TypeScript)
type Action =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: ActionType["ADD_TOAST"];
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toast: ToasterToast;
    }
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: ActionType["UPDATE_TOAST"];
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toast: Partial<ToasterToast>;
    }
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: ActionType["DISMISS_TOAST"];
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toastId?: ToasterToast["id"];
    }
  // Instrução do fluxo — parte da lógica de negócio ou interface
  | {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: ActionType["REMOVE_TOAST"];
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toastId?: ToasterToast["id"];
    };

// Contrato de props ou objeto (TypeScript)
interface State {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  toasts: ToasterToast[];
}

// Constante local
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Constante local
const addToRemoveQueue = (toastId: string) => {
  // Condição — executa bloco só se verdadeira
  if (toastTimeouts.has(toastId)) {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    return;
  }

  // Constante local
  const timeout = setTimeout(() => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    toastTimeouts.delete(toastId);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    dispatch({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: "REMOVE_TOAST",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toastId: toastId,
    });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, TOAST_REMOVE_DELAY);

  // Instrução do fluxo — parte da lógica de negócio ou interface
  toastTimeouts.set(toastId, timeout);
};

// Exporta constante/tipo/classe pública
export const reducer = (state: State, action: Action): State => {
  // Escolhe ramo conforme valor
  switch (action.type) {
    // Caso específico do switch
    case "ADD_TOAST":
      // Retorna valor ou JSX para quem chamou
      return {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...state,
        // Recorta parte da lista (paginação ou limite)
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    // Caso específico do switch
    case "UPDATE_TOAST":
      // Retorna valor ou JSX para quem chamou
      return {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...state,
        // Percorre lista e renderiza um item para cada elemento
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    // Caso específico do switch
    case "DISMISS_TOAST": {
      // Desestrutura valores do hook/contexto (acesso direto às variáveis)
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        addToRemoveQueue(toastId);
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } else {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        state.toasts.forEach((toast) => {
          // Exibe notificação temporária (toast) na tela
          addToRemoveQueue(toast.id);
        });
      }

      // Retorna valor ou JSX para quem chamou
      return {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...state,
        // Percorre lista e renderiza um item para cada elemento
        toasts: state.toasts.map((t) =>
          // Instrução do fluxo — parte da lógica de negócio ou interface
          t.id === toastId || toastId === undefined
            // Instrução do fluxo — parte da lógica de negócio ou interface
            ? {
                // Instrução do fluxo — parte da lógica de negócio ou interface
                ...t,
                // Instrução do fluxo — parte da lógica de negócio ou interface
                open: false,
              }
            // Instrução do fluxo — parte da lógica de negócio ou interface
            : t,
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ),
      };
    }
    // Caso específico do switch
    case "REMOVE_TOAST":
      // Condição — executa bloco só se verdadeira
      if (action.toastId === undefined) {
        // Retorna valor ou JSX para quem chamou
        return {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ...state,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          toasts: [],
        };
      }
      // Retorna valor ou JSX para quem chamou
      return {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...state,
        // Filtra lista — mantém só itens que passam no teste
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// Instrução do fluxo — parte da lógica de negócio ou interface
const listeners: Array<(state: State) => void> = [];

// Variável mutável local
let memoryState: State = { toasts: [] };

// Declara função auxiliar interna
function dispatch(action: Action) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  memoryState = reducer(memoryState, action);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  listeners.forEach((listener) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    listener(memoryState);
  });
}

// Define formato de dados (TypeScript)
type Toast = Omit<ToasterToast, "id">;

// Declara função auxiliar interna
function toast({ ...props }: Toast) {
  // Constante local
  const id = genId();

  // Constante local
  const update = (props: ToasterToast) =>
    // Instrução do fluxo — parte da lógica de negócio ou interface
    dispatch({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type: "UPDATE_TOAST",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      toast: { ...props, id },
    });
  // Constante local
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  // Instrução do fluxo — parte da lógica de negócio ou interface
  dispatch({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    type: "ADD_TOAST",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    toast: {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ...props,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      id,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      open: true,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      onOpenChange: (open) => {
        // Condição — executa bloco só se verdadeira
        if (!open) dismiss();
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      },
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
  });

  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: id,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    dismiss,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    update,
  };
}

/** Hook React — inscreve listener no store global de toasts. */
// Declara função auxiliar interna
function useToast() {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [state, setState] = React.useState<State>(memoryState);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  React.useEffect(() => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    listeners.push(setState);
    // Retorna valor ou JSX para quem chamou
    return () => {
      // Constante local
      const index = listeners.indexOf(setState);
      // Condição — executa bloco só se verdadeira
      if (index > -1) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        listeners.splice(index, 1);
      }
    };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [state]);

  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...state,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    toast,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

// Reexporta símbolos nomeados
export { useToast, toast };

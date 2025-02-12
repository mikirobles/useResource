import * as React from 'react';
// Output
interface State<T> {
  list: (T & Meta)[];
  selected: null | (T & Meta);
  action: null | string;
  error: null | string;
}

interface Methods<T> {
  get: (id: string, promise: Promise<T>) => Promise<T>;
  list: (promise: Promise<T[]>) => Promise<T[]>;
  update: (id: string, promise: Promise<T>) => Promise<T>;
  remove: (id: string, promise: Promise<T>) => Promise<string>;
  create: (promise: Promise<T>) => Promise<T>;
  select: (id: string) => void;
}

// Actions
type AsyncAction = 'get' | 'list' | 'update' | 'remove' | 'create';

interface ActionError {
  id: string;
  message: string;
}

type Action<T = any> =
  | { type: 'GET_RESOURCE_STARTED'; payload: string }
  | { type: 'GET_RESOURCE_RESOLVED'; payload: T }
  | { type: 'GET_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'LIST_RESOURCE_STARTED' }
  | { type: 'LIST_RESOURCE_RESOLVED'; payload: T[] }
  | { type: 'LIST_RESOURCE_REJECTED'; payload: string }
  | { type: 'UPDATE_RESOURCE_STARTED'; payload: string }
  | { type: 'UPDATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'UPDATE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'CREATE_RESOURCE_STARTED' }
  | { type: 'CREATE_RESOURCE_RESOLVED'; payload: T }
  | { type: 'CREATE_RESOURCE_REJECTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_STARTED'; payload: string }
  | { type: 'REMOVE_RESOURCE_RESOLVED'; payload: string }
  | { type: 'REMOVE_RESOURCE_REJECTED'; payload: ActionError }
  | { type: 'SELECT_RESOURCE'; payload: string };

// Helpers
type Dictionary<T> = Record<string, T>;

interface ResourceManager {
  list: Dictionary<any & Meta>;
  action: null | AsyncAction;
  error: null | string;
  selected: null | string;
}

interface Meta {
  meta: {
    action: null | AsyncAction;
    error: null | string;
  };
}

const EMPTY_RESOURCE_MANAGER = {
  list: {},
  action: null,
  error: null,
  selected: null,
};

function resourceManagerReducer(
  state: ResourceManager = EMPTY_RESOURCE_MANAGER,
  action: Action
): ResourceManager {
  switch (action.type) {
    // STARTED
    case 'GET_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'get',
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
            id: action.payload,
            meta: {
              action: 'get',
              error: null,
            },
          },
        },
      };
    }

    case 'UPDATE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'update',
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
            meta: {
              action: 'update',
              error: null,
            },
          },
        },
      };
    }

    case 'REMOVE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'remove',
        list: {
          ...state.list,
          [action.payload]: {
            ...state.list[action.payload],
            meta: {
              action: 'remove',
              error: null,
            },
          },
        },
      };
    }

    case 'CREATE_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'create',
      };
    }

    case 'LIST_RESOURCE_STARTED': {
      return {
        ...state,
        error: null,
        action: 'list',
      };
    }

    // RESOLVED
    case 'GET_RESOURCE_RESOLVED':
    case 'UPDATE_RESOURCE_RESOLVED':
    case 'CREATE_RESOURCE_RESOLVED': {
      return {
        ...state,
        error: null,
        action: null,
        list: {
          ...state.list,
          [action.payload.id]: {
            ...action.payload,
            meta: {
              action: null,
              error: null,
            },
          },
        },
      };
    }

    case 'LIST_RESOURCE_RESOLVED': {
      return {
        ...state,
        error: null,
        action: null,
        list: action.payload.reduce(
          (acc: Dictionary<any>, resource: any) =>
            acc[resource.id]
              ? acc
              : {
                  ...acc,
                  [resource.id]: {
                    ...resource,
                    meta: {
                      action: null,
                      error: null,
                    },
                  },
                },
          {}
        ),
      };
    }

    case 'REMOVE_RESOURCE_RESOLVED': {
      const {
        [action.payload]: removedResource,
        ...remainingResources
      } = state.list;

      return {
        ...state,
        selected: state.selected === action.payload ? null : state.selected,
        error: null,
        action: null,
        list: remainingResources,
      };
    }

    // REJECTED
    case 'GET_RESOURCE_REJECTED':
    case 'UPDATE_RESOURCE_REJECTED':
    case 'REMOVE_RESOURCE_REJECTED': {
      return {
        ...state,
        error: action.payload.message,
        action: null,
        list: {
          ...state.list,
          [action.payload.id]: {
            ...state.list[action.payload.id],
            meta: {
              action: null,
              error: action.payload.message,
            },
          },
        },
      };
    }

    case 'CREATE_RESOURCE_REJECTED': {
      return {
        ...state,
        error: action.payload,
        action: null,
      };
    }

    // SYNC
    case 'SELECT_RESOURCE': {
      return {
        ...state,
        selected: action.payload,
      };
    }

    default:
      return state;
  }
}

export default function useResource<T = any>(): [State<T>, Methods<T>] {
  const reducer = React.useCallback(
    (state: ResourceManager, action: Action): ResourceManager =>
    resourceManagerReducer(state, action),
    []
  );

  const [state, dispatch] = React.useReducer(reducer, EMPTY_RESOURCE_MANAGER);

  const handleGet = React.useCallback((id: string, promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'GET_RESOURCE_STARTED', payload: id });

    return promise
      .then(
        (resource: T): T => {
          dispatch({
            type: 'GET_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'GET_RESOURCE_REJECTED',
          payload: { id, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleList = React.useCallback((promise: Promise<T[]>): Promise<T[]> => {
    dispatch({ type: 'LIST_RESOURCE_STARTED' });

    return promise
      .then((list: T[]): T[] => {
        dispatch({
          type: 'LIST_RESOURCE_RESOLVED',
          payload: list,
        });

        return list;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'LIST_RESOURCE_REJECTED',
          payload: error.message,
        });

        throw error.message;
      });
  }, [dispatch])

  const handleUpdate = React.useCallback((id: string, promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'UPDATE_RESOURCE_STARTED', payload: id });

    return promise
      .then(
        (resource: T): T => {
          dispatch({
            type: 'UPDATE_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'UPDATE_RESOURCE_REJECTED',
          payload: { id, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleCreate = React.useCallback((promise: Promise<T>): Promise<T> => {
    dispatch({ type: 'CREATE_RESOURCE_STARTED' });

    return promise
      .then(
        (resource: T): T => {
          dispatch({
            type: 'CREATE_RESOURCE_RESOLVED',
            payload: resource,
          });

          return resource;
        }
      )
      .catch((error: Error) => {
        dispatch({
          type: 'CREATE_RESOURCE_REJECTED',
          payload: error.message,
        });

        throw error.message;
      });
  }, [dispatch])

  const handleRemove = React.useCallback((id: string, promise: Promise<T>): Promise<string> => {
    dispatch({ type: 'REMOVE_RESOURCE_STARTED', payload: id });

    return promise
      .then((): string => {
        dispatch({
          type: 'REMOVE_RESOURCE_RESOLVED',
          payload: id,
        });

        return id;
      })
      .catch((error: Error) => {
        dispatch({
          type: 'REMOVE_RESOURCE_REJECTED',
          payload: { id, message: error.message },
        });

        throw error.message;
      });
  }, [dispatch])

  const handleSelect = React.useCallback((id: string) => {
    dispatch({ type: 'SELECT_RESOURCE', payload: id });
  }, [dispatch])

  const manager = React.useMemo(() => ({
    list: Object.values(state.list),
    selected: state.selected ? state.list[state.selected] : null,
    action: state.action,
    error: state.error,
  }), [state.list, state.selected, state.action, state.error])

  const actions = React.useMemo(() => ({
    get: handleGet,
    list: handleList,
    update: handleUpdate,
    remove: handleRemove,
    create: handleCreate,
    select: handleSelect,
  }), [handleGet, handleList, handleUpdate, handleRemove, handleCreate, handleSelect])

  return [
    manager,
    actions
  ];
}

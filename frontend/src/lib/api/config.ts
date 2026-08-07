const base = import.meta.env.BASE_URL || '/';

export const BASE_PATH = base === '/' ? '' : base.replace(/\/+$/, '');
export const ROUTER_BASENAME = BASE_PATH || '/';
export const API_BASE = `${BASE_PATH}/api/v1`;

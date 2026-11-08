// Registro de operaciones por familia. Cada familia exporta OPS y tiene su <familia>.fichas.json al lado.
import {OPS as mapas} from './mapas';
import {OPS as clinico} from './clinico';
import {OPS as cocina} from './cocina';
import {OPS as neon} from './neon';
import {OPS as archivo} from './archivo';
export const OPS_EXTRA: Record<string, any> = {...mapas, ...clinico, ...cocina, ...neon, ...archivo};

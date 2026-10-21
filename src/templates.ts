import type { Template } from './types';
import { hype } from './render/hype';
import { clean } from './render/clean';
import { glitch } from './render/glitch';
export const TEMPLATES: Template[] = [hype, clean, glitch];

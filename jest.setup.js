import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder (needed for pg library)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

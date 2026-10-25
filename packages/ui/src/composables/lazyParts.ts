// Feature code components load only when it's used: a Button with `hold`, a Toaster's swipe, a
// Tooltip's glide. The `import()`s live here, beside the code, so both builds resolve them alike.
import { loading } from '../motion/styleKey'

export const loadButtonHold = () => import('./buttonHold')
export const loadToastSwipe = () => import('./toastSwipe')
export const loadSurface = () => import('../motion/surface')
export const loadHoverHandoff = () => import('./hoverHandoff')
export const loadToastStates = () => import('../motion/toastStates')
export const loadAnimateTarget = () => loading(import('../motion/animateTarget'))
export const loadDateText = () => import('./dateText')

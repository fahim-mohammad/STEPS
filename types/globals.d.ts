// Allow CSS side-effect imports (e.g. import './globals.css')
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Allow image imports
declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}
/**
 * @module zustform
 * @description Headless React form solution powered by Zustand + Immer
 *
 * @example
 * import { createForm, useField, FormProvider } from 'zustform'
 *
 * function App() {
 *   const form = createForm({
 *     initialValues: { username: '', email: '' },
 *     onSubmit: async (values) => { await api.post('/user', values) }
 *   })
 *
 *   return (
 *     <FormProvider store={form._store}>
 *       <LoginForm />
 *     </FormProvider>
 *   )
 * }
 *
 * function LoginForm() {
 *   const usernameField = useField('username')
 *   const emailField = useField('email')
 *
 *   return (
 *     <form onSubmit={form.submit}>
 *       <input {...usernameField.propGetters.getInputProps()} />
 *       <input {...emailField.propGetters.getInputProps()} />
 *       <button type="submit">Submit</button>
 *     </form>
 *   )
 * }
 */

// Core
export * from './core/types'
export * from './core/createForm'
export * from './core/validation'
export * from './core/store'
export * from './core/path'
export * from './core/object'
export * from './core/array'

// Hooks
export * from './hooks'

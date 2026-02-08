# ZustForm

> 🐻 Headless React form solution powered by Zustand + Immer

## Features

- **Headless Hooks** - 核心能力通过 Hooks 暴露，无 UI 依赖
- **精确更新** - 基于 Zustand 选择器，字段级精确订阅
- **双路径系统** - address (UI树) vs path (数据)，VoidField 不污染数据
- **简化 Path** - 点分路径，告别复杂表达式
- **transient 字段** - 确认密码、计算字段等不提交的临时数据
- **TypeScript** - 完整类型推断

## Installation

```bash
npm install zustform zustand immer
# or
pnpm add zustform zustand immer
```

## Quick Start

```tsx
import { createForm, FormProvider, useField, useFormContext } from 'zustform'

const form = createForm({
  initialValues: { email: '', password: '' }
})

function LoginForm() {
  const form = useFormContext()
  
  const email = useField('email', {
    rules: [{ required: true, message: '请输入邮箱' }]
  })
  
  const password = useField('password', {
    rules: [{ required: true }]
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit() }}>
      <input {...email.getInputProps()} />
      {email.state.errors[0]}
      
      <input type="password" {...password.getInputProps()} />
      
      <button type="submit">登录</button>
    </form>
  )
}

function App() {
  return (
    <FormProvider form={form} onSubmit={console.log}>
      <LoginForm />
    </FormProvider>
  )
}
```

## Documentation

See [DESIGN.md](./DESIGN.md) for full design document.

## License

MIT

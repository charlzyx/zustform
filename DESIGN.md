# ZustForm - 设计文档

> 🐻 Headless React form solution powered by Zustand + Immer

## 一、设计目标

| 特性 | Formily 方案 | ZustForm 方案 |
|------|-------------|---------------|
| 响应式核心 | @formily/reactive (自研) | Zustand + Immer (生态标准) |
| 精确更新 | ✅ Proxy 追踪 | ✅ 选择器订阅 |
| 路径系统 | FormPath (复杂) | 简化点分路径 |
| 学习曲线 | 陡峭 | 平缓 |
| 架构 | 组件优先 | **Headless Hooks 优先** |

## 二、核心架构

```
┌────────────────────────────────────────────────────┐
│                  适配层 (Adapters)                  │
│   Ant Design / Arco / Material UI / 自定义组件       │
└────────────────────────────────────────────────────┘
                         │
┌────────────────────────────────────────────────────┐
│              桥接层 (Bridge Components)             │
│       <Field> / <VoidField> / <ArrayField>         │
│              (可选便利封装，非必须)                   │
└────────────────────────────────────────────────────┘
                         │
┌────────────────────────────────────────────────────┐
│              核心层 (Headless Hooks)                │
│  useForm / useField / useFieldArray / useWatch...  │
└────────────────────────────────────────────────────┘
                         │
┌────────────────────────────────────────────────────┐
│                状态层 (Zustand Store)               │
│            values / fields / meta                  │
└────────────────────────────────────────────────────┘
```

## 三、双路径系统

### 3.1 问题：VoidField 对路径的影响

```tsx
<FormProvider>
  <VoidField name="userInfo">          {/* UI布局容器，不产生数据 */}
    <Field name="name" />              {/* 数据字段 */}
    <Field name="age" />
  </VoidField>
  <VoidField name="contact">
    <Field name="email" />
  </VoidField>
</FormProvider>
```

**期望的数据结构**（VoidField 不影响）：
```typescript
{
  name: "张三",
  age: 18,
  email: "test@example.com"
}
```

**UI 树结构**（VoidField 参与）：
```
Form
├── userInfo (void)
│   ├── name (field)
│   └── age (field)
└── contact (void)
    └── email (field)
```

### 3.2 解决方案：Address vs Path

```typescript
// address: 完整 UI 树路径（包含 VoidField）
// path: 数据路径（不包含 VoidField）

interface FieldMeta {
  address: string    // "userInfo.name" - UI定位
  path: string       // "name" - 数据定位
  isVoid: boolean
}
```

### 3.3 路径工具

```typescript
type Path = string  // "user.name" | "items.0.title" | "address"

const pathUtils = {
  get: (obj: any, path: string) => any,
  set: (obj: any, path: string, value: any) => void,  // immer produce
  parent: (path: string) => string,
  last: (path: string) => string,
  join: (...parts: string[]) => string,
}
```

## 四、字段类型

| Hook | 有 address | 有 path | 有 value | transient 可用 | 典型场景 |
|------|-----------|---------|----------|----------------|----------|
| `useField` | ✅ | ✅ | ✅ | ✅ | 所有数据字段 |
| `useVoidField` | ✅ | ❌ | ❌ | ❌ | 布局容器、卡片、分组 |
| `useFieldArray` | ✅ | ✅ | ✅ | ✅ | 数组字段 |

### transient 标志

```typescript
interface UseFieldOptions<T = any> {
  defaultValue?: T
  rules?: ValidationRule[]
  validateTrigger?: 'change' | 'blur' | 'submit' | ('change' | 'blur')[]
  preserveValue?: boolean
  
  // 瞬态字段，提交时过滤掉
  transient?: boolean
}
```

**使用示例**：

```tsx
// 确认密码 - 有值有校验，但不提交
const confirmPassword = useField('confirmPassword', {
  transient: true,
  rules: [{
    validator: (value, ctx) => 
      value !== ctx.getFieldValue('password') ? '密码不一致' : undefined
  }]
})

// 计算字段
const total = useField('total', { transient: true })

useWatch(['price', 'quantity'], ([price, qty]) => {
  form.setFieldValue('total', (price ?? 0) * (qty ?? 1))
})
```

## 五、Store 设计

### 5.1 状态结构

```typescript
interface FormStoreState<T = any> {
  // 数据层
  values: T
  initialValues: T
  
  // 字段层 (以 address 为 key)
  fields: Record<string, FieldEntry>
  
  // 表单元信息
  meta: {
    submitting: boolean
    submitCount: number
    validating: boolean
    dirty: boolean
  }
}

interface FieldEntry {
  // 路径信息
  address: string      // UI 路径 (唯一标识)
  path: string | null  // 数据路径 (void 时为 null)
  isVoid: boolean
  transient: boolean   // 提交时过滤
  
  // 状态
  state: FieldState
  
  // 配置
  rules: ValidationRule[]
  
  // 挂载状态
  mounted: boolean
}

interface FieldState {
  touched: boolean
  active: boolean
  dirty: boolean
  visible: boolean
  disabled: boolean
  readOnly: boolean
  validating: boolean
  errors: string[]
  warnings: string[]
}
```

### 5.2 Store Actions

```typescript
interface FormStoreActions<T> {
  // 值操作 (基于 path)
  setValues: (values: Partial<T>) => void
  setFieldValue: (path: string, value: any) => void
  getFieldValue: (path: string) => any
  resetValues: () => void
  
  // 字段注册 (基于 address)
  registerField: (address: string, entry: Omit<FieldEntry, 'address'>) => void
  unregisterField: (address: string) => void
  
  // 字段状态 (基于 address)
  setFieldState: (address: string, state: Partial<FieldState>) => void
  getFieldState: (address: string) => FieldState | undefined
  
  // 校验
  validateField: (address: string) => Promise<boolean>
  validateForm: () => Promise<Record<string, string[]>>
  clearErrors: (address?: string) => void
  
  // 提交
  setSubmitting: (submitting: boolean) => void
  
  // 订阅 (基于 path)
  subscribeValue: (path: string, callback: (value: any) => void) => () => void
}
```

## 六、核心 Hooks API

### 6.1 表单级 Hooks

```typescript
// 创建表单实例
function createForm<T>(options: FormOptions<T>): FormInstance<T>

// 获取表单实例
function useFormContext<T>(): FormInstance<T>

// 获取表单状态（精确订阅）
function useFormState<R>(selector: (state: FormState) => R): R

// 获取表单值（精确订阅）
function useFormValues<T, R = T>(selector?: (values: T) => R): R
```

### 6.2 useField

```typescript
interface UseFieldOptions<T = any> {
  defaultValue?: T
  rules?: ValidationRule[]
  dependencies?: string[]
  validateTrigger?: 'change' | 'blur' | 'submit' | ('change' | 'blur')[]
  preserveValue?: boolean
  transient?: boolean
  
  // 装饰器配置 (用于 FormItem 等容器组件)
  label?: ReactNode
  description?: ReactNode
  decorator?: DecoratorConfig
}

// 装饰器配置
interface DecoratorConfig {
  // 装饰器组件 (如 FormItem, Form.Item 等)
  component?: React.ComponentType<DecoratorProps>
  // 传递给装饰器的额外 props
  props?: Record<string, any>
}

// 装饰器组件接收的 props
interface DecoratorProps {
  // 字段元信息
  label?: ReactNode
  description?: ReactNode
  required?: boolean
  
  // 校验状态
  errors?: string[]
  warnings?: string[]
  validating?: boolean
  
  // 其他状态
  disabled?: boolean
  
  // 子元素 (实际的输入控件)
  children: ReactNode
}

interface UseFieldReturn<T = any> {
  // 字段标识
  name: string
  address: string     // UI 树路径
  path: string        // 数据路径
  
  // 值操作
  value: T
  onChange: (value: T) => void
  onBlur: () => void
  onFocus: () => void
  
  // 状态
  state: {
    touched: boolean
    active: boolean
    dirty: boolean
    validating: boolean
    errors: string[]
    warnings: string[]
  }
  
  // 状态操作
  setError: (errors: string | string[]) => void
  clearError: () => void
  validate: () => Promise<boolean>
  reset: () => void
  
  // 控制属性
  disabled: boolean
  readOnly: boolean
  visible: boolean
  setDisabled: (disabled: boolean) => void
  setVisible: (visible: boolean) => void
  
  // 装饰器相关
  label?: ReactNode
  description?: ReactNode
  
  // 获取装饰器 props (传递给 FormItem 等)
  getDecoratorProps: () => DecoratorProps
  
  // 便捷绑定 (Headless 核心)
  getInputProps: () => {
    value: T
    onChange: (e: any) => void
    onBlur: () => void
    onFocus: () => void
    disabled: boolean
    readOnly: boolean
  }
  
  getCheckboxProps: () => {
    checked: boolean
    onChange: (e: any) => void
    disabled: boolean
  }
  
  getSelectProps: () => {
    value: T
    onChange: (value: T) => void
    disabled: boolean
  }
}
```

### 6.3 useVoidField

```typescript
interface UseVoidFieldOptions {
  visible?: boolean
}

interface UseVoidFieldReturn {
  name: string
  address: string
  // 没有 path（不产生数据）
  
  visible: boolean
  setVisible: (v: boolean) => void
}
```

### 6.4 useFieldArray

```typescript
interface UseFieldArrayReturn<T> {
  name: string
  path: string
  
  // 数组数据
  fields: Array<{ id: string; value: T }>
  
  // 操作方法
  append: (value: T) => void
  prepend: (value: T) => void
  insert: (index: number, value: T) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  swap: (indexA: number, indexB: number) => void
  replace: (values: T[]) => void
  
  // 状态
  error: string | undefined
}
```

### 6.5 useWatch (联动)

```typescript
// 单值监听
function useWatch<T>(path: string): T

// 多值监听
function useWatch<T extends any[]>(paths: string[]): T

// 带回调（不触发重渲染）
function useWatch(
  paths: string | string[],
  callback: (value: any, prevValue: any) => void,
  options?: { immediate?: boolean }
): void
```

## 七、FormInstance API

```typescript
interface FormInstance<T> {
  // 值
  getValues(): T
  getSubmitValues(): T  // 过滤 transient 字段
  setValues(values: Partial<T>): void
  getFieldValue(path: string): any
  setFieldValue(path: string, value: any): void
  resetValues(): void
  
  // 状态  
  getFieldState(address: string): FieldState | undefined
  setFieldState(address: string, state: Partial<FieldState>): void
  
  // 校验
  validate(address?: string): Promise<boolean>
  clearErrors(address?: string): void
  
  // 提交
  submit(onSubmit?: (values: T) => Promise<void>): Promise<void>
  
  // 联动
  watch(path: string | string[], cb: Function): () => void
  batch(fn: () => void): void
  
  // Store 访问
  getStore(): FormStoreState<T>
  subscribe(listener: () => void): () => void
}
```

## 八、校验系统

### 8.1 规则类型

`rules` 统一支持内置规则和 Schema 校验：

```typescript
// 规则可以是内置规则对象，也可以是 Schema
type FieldRules<T = any> = Array<ValidationRule | SchemaLike<T>>

interface UseFieldOptions<T = any> {
  // 统一的规则数组，支持混合使用
  rules?: FieldRules<T>
}
```

### 8.2 内置规则

```typescript
interface ValidationRule {
  type?: 'string' | 'number' | 'email' | 'url' | 'pattern'
  required?: boolean
  pattern?: RegExp
  min?: number
  max?: number
  len?: number
  message?: string
  validator?: (value: any, context: ValidatorContext) => 
    string | void | Promise<string | void>
  trigger?: 'change' | 'blur' | 'submit'
}

interface ValidatorContext {
  getFieldValue: (path: string) => any
  getFieldState: (address: string) => FieldState | undefined
}
```

### 8.3 Schema 规则

支持 Zod、Yup、Valibot 等主流 schema 库，直接放入 `rules` 数组：

```typescript
// 通用 Schema 接口
type SchemaLike<T> = 
  | ZodSchema<T>           // Zod
  | YupSchema<T>           // Yup
  | ValibotSchema<T>       // Valibot
  | CustomSchema<T>        // 自定义

// 表单级配置解析器
interface FormOptions<T> {
  initialValues: T
  
  // 表单级 schema（可选，自动拆分到各字段）
  schema?: SchemaLike<T>
  
  // schema 解析器（自动检测或手动指定）
  schemaResolver?: SchemaResolver
}
```

### 8.4 解析器设计

```typescript
// 校验器解析器
interface SchemaResolver {
  // 检测是否为该类型的 schema
  detect: (rule: any) => boolean
  
  // 校验单个值
  validate: (schema: SchemaLike<any>, value: any) => Promise<ValidationResult>
  
  // 校验整个表单（可选）
  validateForm?: (schema: SchemaLike<any>, values: any) => Promise<FormValidationResult>
  
  // 从表单 schema 中提取字段 schema（可选）
  pickFieldSchema?: (schema: SchemaLike<any>, path: string) => SchemaLike<any> | undefined
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface FormValidationResult {
  valid: boolean
  errors: Record<string, string[]>  // path -> errors
}
```

### 8.5 内置解析器

```typescript
// Zod 解析器
import { zodResolver } from 'zustform/resolvers/zod'

// Yup 解析器
import { yupResolver } from 'zustform/resolvers/yup'

// Valibot 解析器
import { valibotResolver } from 'zustform/resolvers/valibot'

// 注册解析器（全局或表单级）
import { registerResolver } from 'zustform'

// 全局注册（一次配置，到处使用）
registerResolver(zodResolver)
registerResolver(yupResolver)
```

### 8.6 使用示例

```tsx
import { z } from 'zod'
import * as yup from 'yup'

// ===== 统一在 rules 中使用 =====
function RegisterForm() {
  // 内置规则
  const username = useField('username', {
    rules: [
      { required: true, message: '请输入用户名' },
      { min: 2, max: 20, message: '2-20个字符' }
    ]
  })
  
  // Zod schema 放入 rules
  const email = useField('email', {
    rules: [
      z.string().email('邮箱格式不正确')
    ]
  })
  
  // Yup schema 放入 rules
  const password = useField('password', {
    rules: [
      yup.string().min(6, '密码至少6位').required('请输入密码')
    ]
  })
  
  // 混合使用：内置规则 + Schema + 自定义
  const code = useField('code', {
    rules: [
      { required: true, message: '请输入验证码' },
      z.string().length(6, '验证码为6位'),
      {
        validator: async (value, ctx) => {
          const valid = await verifyCode(value)
          if (!valid) return '验证码错误'
        },
        trigger: 'blur'
      }
    ]
  })
  
  return (...)
}


// ===== 表单级 Schema =====
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  profile: z.object({
    name: z.string(),
    age: z.number().min(18)
  })
})

const form = createForm({
  initialValues: { email: '', password: '', profile: { name: '', age: 0 } },
  schema: formSchema,  // 自动拆分到各字段
  schemaResolver: zodResolver,
})
```

### 8.7 规则执行顺序

`rules` 数组按顺序执行，遇到第一个错误即停止（可配置）：

```typescript
interface FormOptions<T> {
  // 遇到第一个错误就停止
  validateFirst?: boolean  // 默认 true
}

// 执行流程
rules.forEach(rule => {
  if (isSchemaLike(rule)) {
    // 通过解析器校验
    const resolver = detectResolver(rule)
    return resolver.validate(rule, value)
  } else {
    // 内置规则校验
    return validateBuiltinRule(rule, value)
  }
})
```

### 8.8 自定义解析器

```typescript
import { defineResolver, registerResolver } from 'zustform'

// 适配其他校验库
const myResolver = defineResolver({
  // 检测规则类型
  detect: (rule) => rule instanceof MySchema,
  
  // 校验实现
  validate: async (schema, value) => {
    try {
      await schema.validate(value)
      return { valid: true, errors: [] }
    } catch (e) {
      return { valid: false, errors: [e.message] }
    }
  }
})

// 注册
registerResolver(myResolver)
```

## 九、使用示例

当同时配置多种校验时：

1. `schema` (Zod/Yup) - 最高优先级
2. `rules` (内置规则) - 次优先级
3. 表单级 `schema` 拆分到字段 - 最低优先级

```typescript
// schema 优先于 rules
const field = useField('email', {
  schema: z.string().email(),  // ✅ 生效
  rules: [{ required: true }]  // ❌ 被忽略
})
```

### 8.7 自定义解析器

```typescript
import { defineResolver } from 'zustform'

// 适配其他校验库
const myResolver = defineResolver({
  validate: async (schema, value) => {
    try {
      await schema.parse(value)
      return { valid: true, errors: [] }
    } catch (e) {
      return { valid: false, errors: extractErrors(e) }
    }
  },
  
  validateForm: async (schema, values) => {
    // ...
  }
})
```

## 九、使用示例

### 9.1 纯 Hooks 方式

```tsx
function LoginForm() {
  const form = useFormContext()
  
  const email = useField('email', {
    label: '邮箱',
    rules: [
      { required: true, message: '请输入邮箱' },
      { type: 'email', message: '邮箱格式不正确' }
    ]
  })
  
  const password = useField('password', {
    label: '密码',
    rules: [{ required: true, message: '请输入密码' }]
  })
  
  const rememberMe = useField('rememberMe', {
    label: '记住我',
    defaultValue: false
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit() }}>
      <div>
        <label>{email.label}</label>
        <input {...email.getInputProps()} />
        {email.state.errors[0] && <span>{email.state.errors[0]}</span>}
      </div>
      
      <div>
        <label>{password.label}</label>
        <input type="password" {...password.getInputProps()} />
      </div>
      
      <div>
        <label>
          <input type="checkbox" {...rememberMe.getCheckboxProps()} />
          {rememberMe.label}
        </label>
      </div>
      
      <button type="submit">登录</button>
    </form>
  )
}
```

### 9.2 使用 Decorator (FormItem)

```tsx
// 全局配置默认装饰器
const form = createForm({
  initialValues: {},
  decorator: {
    component: AntdFormItem,  // 默认使用 Ant Design 的 Form.Item
  }
})

// 自定义 FormItem 包装
function FormItem({ label, required, errors, validating, children }: DecoratorProps) {
  return (
    <div className="form-item">
      <label>
        {required && <span className="required">*</span>}
        {label}
      </label>
      <div className="form-item-control">
        {children}
        {validating && <span className="loading">校验中...</span>}
        {errors?.[0] && <span className="error">{errors[0]}</span>}
      </div>
    </div>
  )
}

// 使用装饰器
function MyForm() {
  const email = useField('email', {
    label: '邮箱',
    decorator: { component: FormItem },
    rules: [{ required: true }]
  })
  
  // 方式1: 手动包装
  return (
    <FormItem {...email.getDecoratorProps()}>
      <input {...email.getInputProps()} />
    </FormItem>
  )
}

// 方式2: 使用桥接组件 (自动包装)
function MyForm() {
  return (
    <Field 
      name="email" 
      label="邮箱"
      decorator={{ component: FormItem }}
      rules={[{ required: true }]}
    >
      <Input />
    </Field>
  )
}
```

### 9.3 VoidField 布局

```tsx
function UserForm() {
  const basicInfo = useVoidField('basicInfo')
  const contactInfo = useVoidField('contactInfo')
  
  const name = useField('name', { label: '姓名' })
  const age = useField('age', { label: '年龄' })
  const email = useField('email', { label: '邮箱' })
  
  return (
    <div>
      {basicInfo.visible && (
        <Card title="基本信息">
          <input {...name.getInputProps()} />
          <input type="number" {...age.getInputProps()} />
        </Card>
      )}
      
      {contactInfo.visible && (
        <Card title="联系方式">
          <input {...email.getInputProps()} />
        </Card>
      )}
    </div>
  )
}

// 数据结构：{ name: "", age: 0, email: "" }
// 不含 basicInfo/contactInfo
```

### 9.4 数组字段

```tsx
function UserList() {
  const { fields, append, remove } = useFieldArray<User>('users')
  
  return (
    <div>
      {fields.map((field, index) => (
        <UserItem key={field.id} index={index} onRemove={() => remove(index)} />
      ))}
      <button onClick={() => append({ name: '', age: 0 })}>
        添加用户
      </button>
    </div>
  )
}

function UserItem({ index, onRemove }: { index: number; onRemove: () => void }) {
  const name = useField(`users.${index}.name`)
  const age = useField(`users.${index}.age`)
  
  return (
    <div>
      <input {...name.getInputProps()} />
      <input type="number" {...age.getInputProps()} />
      <button onClick={onRemove}>删除</button>
    </div>
  )
}
```

### 9.5 联动示例

```tsx
function MyForm() {
  const form = useFormContext()
  const country = useWatch('country')
  const province = useField('province')
  
  useEffect(() => {
    if (country === 'China') {
      province.setVisible(true)
      fetchProvinces().then(options => {
        form.setFieldMeta('province', { dataSource: options })
      })
    } else {
      province.setVisible(false)
      province.onChange(undefined)
    }
  }, [country])
  
  // 回调式联动（不触发重渲染）
  useWatch(['type', 'subType'], ([type, subType]) => {
    form.setFieldState('extra', {
      visible: type === 'advanced',
    })
  })
  
  return (...)
}
```

### 9.6 transient 字段

```tsx
function RegisterForm() {
  const form = useFormContext()
  
  const password = useField('password', {
    rules: [{ required: true }, { min: 6 }]
  })
  
  const confirmPassword = useField('confirmPassword', {
    transient: true,  // 不提交
    rules: [{
      validator: (value, ctx) => 
        value !== ctx.getFieldValue('password') ? '密码不一致' : undefined
    }]
  })
  
  const passwordStrength = useField('passwordStrength', {
    transient: true  // 计算字段，不提交
  })
  
  useWatch('password', (pwd) => {
    const strength = pwd?.length < 6 ? '弱' : pwd?.length < 10 ? '中' : '强'
    form.setFieldValue('passwordStrength', strength)
  })

  const handleSubmit = async () => {
    if (await form.validate()) {
      const values = form.getSubmitValues()
      // { password: "xxx" } - 不含 confirmPassword 和 passwordStrength
    }
  }

  return (...)
}
```

## 十、项目结构

```
zustform/
├── src/
│   ├── core/
│   │   ├── createForm.ts    # 创建表单
│   │   ├── store.ts         # Zustand store
│   │   ├── path.ts          # 路径工具
│   │   ├── validation.ts    # 校验引擎
│   │   └── types.ts         # 类型定义
│   │
│   ├── hooks/
│   │   ├── useFormContext.ts
│   │   ├── useFormState.ts
│   │   ├── useFormValues.ts
│   │   ├── useField.ts
│   │   ├── useVoidField.ts
│   │   ├── useFieldArray.ts
│   │   ├── useWatch.ts
│   │   └── index.ts
│   │
│   ├── components/          # 可选桥接组件
│   │   ├── FormProvider.tsx
│   │   ├── Field.tsx
│   │   ├── VoidField.tsx
│   │   └── ArrayField.tsx
│   │
│   └── index.ts
│
├── DESIGN.md
├── README.md
├── package.json
└── tsconfig.json
```

## 十一、实现优先级

### Phase 1 - 核心能力
1. Store 设计 + 类型定义
2. `createForm` / `useFormContext`
3. `useField` + 精确订阅
4. 基础校验 (required/pattern/min/max)
5. `getSubmitValues` (transient 过滤)

### Phase 2 - 增强功能
1. `useVoidField` + 双路径系统
2. `useFieldArray` 数组操作
3. `useWatch` 联动
4. 异步校验
5. DevTools 集成

### Phase 3 - 生态扩展
1. 桥接组件 (`<Field>` / `<VoidField>`)
2. UI 库适配器 (Ant Design / Arco)
3. JSON Schema 驱动（可选）
4. SSR 支持

---

## License

MIT

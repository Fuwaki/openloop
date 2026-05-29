export interface PlantModel {
  id: string
  name: string
  category: 'linear' | 'nonlinear' | 'custom'
  description: string
  icon: string
  params: Array<{ name: string; value: number; min: number; max: number; step: number }>
}

const models: PlantModel[] = [
  {
    id: 'mass-spring-damper',
    name: '质量-弹簧-阻尼',
    category: 'linear',
    description: '经典二阶系统 mẍ + cẋ + kx = F，控制理论入门模型',
    icon: 'i-carbon-3d-curve-auto-colon',
    params: [
      { name: 'm', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'c', value: 0.5, min: 0, max: 5, step: 0.1 },
      { name: 'k', value: 2, min: 0.1, max: 20, step: 0.1 },
    ],
  },
  {
    id: 'second-order',
    name: '二阶线性系统',
    category: 'linear',
    description: '标准二阶传递函数 ωn²/(s² + 2ζωn·s + ωn²)，可调阻尼比和自然频率',
    icon: 'i-carbon-chart-line-data',
    params: [
      { name: 'ωn', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'ζ', value: 0.5, min: 0, max: 2, step: 0.01 },
    ],
  },
  {
    id: 'high-order',
    name: '高阶线性系统',
    category: 'linear',
    description: '三阶及以上传递函数，含多个极点，分析稳定性和响应特性',
    icon: 'i-carbon-chart-line-smooth',
    params: [
      { name: 'a1', value: 1, min: 0, max: 10, step: 0.1 },
      { name: 'a2', value: 2, min: 0, max: 10, step: 0.1 },
      { name: 'a3', value: 1, min: 0, max: 10, step: 0.1 },
    ],
  },
  {
    id: 'inverted-pendulum',
    name: '倒立摆',
    category: 'nonlinear',
    description: '经典非线性控制问题，小车-摆杆系统，状态空间建模',
    icon: 'i-carbon-balance',
    params: [
      { name: 'M', value: 0.5, min: 0.1, max: 5, step: 0.1 },
      { name: 'm', value: 0.2, min: 0.05, max: 2, step: 0.05 },
      { name: 'l', value: 0.3, min: 0.1, max: 2, step: 0.05 },
    ],
  },
]

export function getModels(): PlantModel[] {
  return models
}

export function getModelsByCategory(category: PlantModel['category']): PlantModel[] {
  return models.filter((m) => m.category === category)
}

export function getModelById(id: string): PlantModel | undefined {
  return models.find((m) => m.id === id)
}

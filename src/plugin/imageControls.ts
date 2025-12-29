import type { Topic } from '../types/dom'
import type { MindElixirInstance, NodeObj } from '../types/index'
import { isTopic } from '../utils'
import './imageControls.less'

export interface ImageControlsOptions {
  enableSizeControls?: boolean
  enableStyleControl?: boolean
  enableFullscreen?: boolean
}

export class ImageControls {
  private container: HTMLDivElement
  private currentTopic: Topic | null = null
  private currentNodeObj: NodeObj | null = null

  constructor(
    private mind: MindElixirInstance,
    private options: ImageControlsOptions = {}
  ) {
    this.container = this.createControlsContainer()
    this.setupEventListeners()
    this.hide()
  }

  private createControlsContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'image-controls'
    container.innerHTML = `
    <div class="controls-content">
        ${this.options.enableSizeControls ? this.createSizeControls() : ''}
        ${this.options.enableStyleControl ? this.createStyleControl() : ''}
        ${this.options.enableFullscreen ? this.createOtherButton() : ''}
        </div>
    `
    return container
  }

  private createSizeControls(): string {
    return `
    <div class="size-controls">
    <div class="control-group">
    <input type="number" class="width-input" min="10" max="5000">
    <span>*</span>
    <input type="number" class="height-input" min="10" max="5000">
    <span>px</span>
    </div>
    </div>
    `
  }

  private createStyleControl(): string {
    return `
    <div class="style-control">
    <select class="fit-select">
    <option value="fill">Fill</option>
    <option value="cover">Cover</option>
    <option value="contain">Contain</option>
    </select>
    </div>
    `
  }

  private createOtherButton(): string {
    return `
    <div class="fullscreen-control">
      <button class="fullscreen-btn" title="fullscreen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
      </svg>
      </button>
      <button class="remove-btn" title="remove-image">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
      </svg>
      </button>
    </div>
    `
  }

  private setupEventListeners(): void {
    if (this.options.enableSizeControls) {
      this.setupSizeControls()
    }
    if (this.options.enableStyleControl) {
      this.setupStyleControl()
    }
    if (this.options.enableFullscreen) {
      this.setupOtherControl()
    }
  }

  private setupSizeControls(): void {
    const widthInput = this.container.querySelector('.width-input') as HTMLInputElement
    const heightInput = this.container.querySelector('.height-input') as HTMLInputElement

    const updateSize = () => {
      const image = this.currentNodeObj?.image
      if (!image) return

      const width = parseInt(widthInput.value, 10)
      const height = parseInt(heightInput.value, 10)

      if (width > 0 && height > 0) {
        if (width === image.width && height === image.height) return

        this.mind.reshapeNode(this.currentTopic!, {
          image: {
            ...image,
            width,
            height,
          },
        })
        this.hide()
      }
    }

    const stopPropagation = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        updateSize()
        widthInput.blur()
        heightInput.blur()
      }
    }

    widthInput?.addEventListener('change', updateSize)
    widthInput?.addEventListener('keydown', stopPropagation as any)
    heightInput?.addEventListener('change', updateSize)
    heightInput?.addEventListener('keydown', stopPropagation as any)
  }

  private setupStyleControl(): void {
    const fitSelect = this.container.querySelector('.fit-select') as HTMLSelectElement

    const updateStyle = () => {
      const image = this.currentNodeObj?.image
      if (!image) return

      const fit = fitSelect.value as 'fill' | 'cover' | 'contain'

      this.mind.reshapeNode(this.currentTopic!, {
        image: {
          ...image,
          fit: fit,
        },
      })
      this.hide()
    }

    fitSelect?.addEventListener('change', updateStyle)
  }

  private setupOtherControl(): void {
    const fullscreenBtn = this.container.querySelector('.fullscreen-btn') as HTMLButtonElement

    fullscreenBtn?.addEventListener('click', () => {
      if (this.currentNodeObj?.image) {
        this.showFullscreen(this.currentNodeObj.image.url)
      }
    })

    const removeBtn = this.container.querySelector('.fullscreen-btn') as HTMLButtonElement

    fullscreenBtn?.addEventListener('click', () => {
      if (this.currentNodeObj?.image) {
        this.showFullscreen(this.currentNodeObj.image.url)
      }
    })
  }

  private showFullscreen(imageUrl: string): void {
    const fullscreenContainer = document.createElement('div')
    fullscreenContainer.className = 'image-fullscreen'
    fullscreenContainer.innerHTML = `
    <div class="fullscreen-content">
    <img src="${this.mind.imageProxy ? this.mind.imageProxy(imageUrl) : imageUrl}" alt="Fullscreen Image">
    <button class="close-btn" title="关闭">&times;</button>
    </div>
    `

    document.body.appendChild(fullscreenContainer)

    const closeFullscreen = () => {
      fullscreenContainer.remove()
    }

    fullscreenContainer.querySelector('.close-btn')?.addEventListener('click', closeFullscreen)
    fullscreenContainer.addEventListener('click', e => {
      if (e.target === fullscreenContainer) {
        closeFullscreen()
      }
    })

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen()
        document.removeEventListener('keydown', handleEsc)
      }
    }
    document.addEventListener('keydown', handleEsc)
  }

  show(topic: Topic, nodeObj: NodeObj): void {
    if (!nodeObj.image) return

    this.currentTopic = topic
    this.currentNodeObj = nodeObj

    this.updateControlValues(nodeObj.image)

    this.positionControls(topic)

    this.container.hidden = false
  }

  private updateControlValues(image: NodeObj['image']): void {
    if (!image) return

    if (this.options.enableSizeControls) {
      const widthInput = this.container.querySelector('.width-input') as HTMLInputElement
      const heightInput = this.container.querySelector('.height-input') as HTMLInputElement

      if (widthInput) widthInput.value = image.width.toString()
      if (heightInput) heightInput.value = image.height.toString()
    }

    if (this.options.enableStyleControl) {
      const fitSelect = this.container.querySelector('.fit-select') as HTMLSelectElement
      if (fitSelect) fitSelect.value = image.fit || 'cover'
    }
  }

  private positionControls(topic: Topic): void {
    const rect = topic.getBoundingClientRect()
    const containerRect = this.mind.container.getBoundingClientRect()

    this.container.style.position = 'absolute'
    this.container.style.zIndex = '1000'
    this.container.style.top = `${Math.max(rect.top - containerRect.top - 45, 5)}px`
    this.container.style.left = `${Math.max(rect.left - containerRect.left - 5, 5)}px`
  }

  hide(): void {
    this.container.hidden = true
    this.currentTopic = null
    this.currentNodeObj = null
  }

  destroy(): void {
    this.container.remove()
  }

  getContainer(): HTMLDivElement {
    return this.container
  }
}

export interface ImageControlsPluginOptions {
  enableSizeControls?: boolean
  enableStyleControl?: boolean
  enableFullscreen?: boolean
  triggerOn?: 'click' | 'hover' | 'doubleclick'
}

export default function (mind: MindElixirInstance, options: ImageControlsPluginOptions = {}) {
  const { enableSizeControls = true, enableStyleControl = true, enableFullscreen = true, triggerOn = 'click' } = options

  const imageControls = new ImageControls(mind, {
    enableSizeControls,
    enableStyleControl,
    enableFullscreen,
  })

  mind.container.appendChild(imageControls.getContainer())

  const hideControls = () => {
    imageControls.hide()
  }

  const showControls = (topic: Topic) => {
    if (topic.nodeObj?.image) {
      imageControls.show(topic, topic.nodeObj)
    }
  }

  const setupEventListeners = () => {
    switch (triggerOn) {
      case 'click':
        mind.map.addEventListener('click', handleClick)
        break
      case 'hover':
        mind.map.addEventListener('mouseenter', handleMouseEnter)
        mind.map.addEventListener('mouseleave', handleMouseLeave)
        break
      case 'doubleclick':
        mind.map.addEventListener('dblclick', handleDoubleClick)
        break
    }

    document.addEventListener('click', handleDocumentClick)
  }

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isTopic(target) && target.nodeObj?.image) {
      showControls(target)
    } else if (!imageControls.getContainer().contains(target)) {
      hideControls()
    }
  }

  const handleMouseEnter = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isTopic(target) && target.nodeObj?.image) {
      showControls(target)
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isTopic(target)) {
      setTimeout(() => {
        if (!imageControls.getContainer().matches(':hover')) {
          hideControls()
        }
      }, 200)
    }
  }

  const handleDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isTopic(target) && target.nodeObj?.image) {
      showControls(target)
    }
  }

  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!mind.container.contains(target) && !imageControls.getContainer().contains(target)) {
      hideControls()
    }
  }

  setupEventListeners()

  return () => {
    switch (triggerOn) {
      case 'click':
        mind.map.removeEventListener('click', handleClick)
        break
      case 'hover':
        mind.map.removeEventListener('mouseenter', handleMouseEnter)
        mind.map.removeEventListener('mouseleave', handleMouseLeave)
        break
      case 'doubleclick':
        mind.map.removeEventListener('dblclick', handleDoubleClick)
        break
    }

    document.removeEventListener('click', handleDocumentClick)

    imageControls.destroy()
  }
}

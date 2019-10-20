class TrailsEffect extends EffectShell {
  constructor(container = document.body, itemsWrapper = null, options = {}) {
    super(container, itemsWrapper)
    if (!this.container || !this.itemsWrapper) return

    options.strength = options.strength || 0.25
    options.amount = options.amount || 5
    options.duration = options.duration || 0.5
    this.options = options

    this.init()
  }

  init() {
    this.position = new THREE.Vector3(0, 0, 0)
    this.scale = new THREE.Vector3(1, 1, 1)
    this.geometry = new THREE.PlaneBufferGeometry(1, 1, 16, 16)
    //shared uniforms
    this.uniforms = {
      uTime: {
        value: 0
      },
      uTexture: {
        value: null
      },
      uOffset: {
        value: new THREE.Vector2(0.0, 0.0)
      },
      uAlpha: {
        value: 0
      }
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform vec2 uOffset;

        varying vec2 vUv;

        vec3 deformationCurve(vec3 position, vec2 uv, vec2 offset) {
          float M_PI = 3.1415926535897932384626433832795;
          position.x = position.x + (sin(uv.y * M_PI) * offset.x);
          position.y = position.y + (sin(uv.x * M_PI) * offset.y);
          return position;
        }

        void main() {
          vUv = uv;
          vec3 newPosition = position;
          newPosition = deformationCurve(position,uv,uOffset);
          gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uAlpha;
        uniform vec2 uOffset;

        varying vec2 vUv;

        void main() {
          vec3 color = texture2D(uTexture,vUv).rgb;
          gl_FragColor = vec4(color,uAlpha);
        }
      `,
      transparent: true
    })
    this.plane = new THREE.Mesh(this.geometry, this.material)

    this.trails = []
    for (let i = 0; i < this.options.amount; i++) {
      let plane = this.plane.clone()
      this.trails.push(plane)
      this.scene.add(plane)
    }
  }

  onMouseEnter() {
    if (!this.currentItem || !this.isMouseOver) {
      this.isMouseOver = true
      // show plane
      TweenLite.to(this.uniforms.uAlpha, 0.5, {
        value: 1,
        ease: Power4.easeOut
      })
    }
  }

  onMouseLeave(event) {
    TweenLite.to(this.uniforms.uAlpha, 0.5, {
      value: 0,
      ease: Power4.easeOut
    })
  }

  onMouseMove(event) {
    // project mouse position to world coodinates
    let x = this.mouse.x.map(
      -1,
      1,
      -this.viewSize.width / 2,
      this.viewSize.width / 2
    )
    let y = this.mouse.y.map(
      -1,
      1,
      -this.viewSize.height / 2,
      this.viewSize.height / 2
    )

    TweenLite.to(this.position, 1, {
      x: x,
      y: y,
      ease: Power4.easeOut,
      onUpdate: () => {
        // compute offset
        let offset = this.position
          .clone()
          .sub(new THREE.Vector3(x, y, 0))
          .multiplyScalar(-this.options.strength)
        this.uniforms.uOffset.value = offset
      }
    })

    this.trails.forEach((trail, index) => {
      let duration =
        this.options.duration * this.options.amount -
        this.options.duration * index
      TweenLite.to(trail.position, duration, {
        x: x,
        y: y,
        ease: Power4.easeOut
      })
    })
  }

  onMouseOver(index, e) {
    if (!this.isLoaded) return
    this.onMouseEnter()
    if (this.currentItem && this.currentItem.index === index) return
    this.onTargetChange(index)
  }

  onTargetChange(index) {
    // item target changed
    this.currentItem = this.items[index]
    if (!this.currentItem.texture) return

    // compute image ratio
    let imageRatio =
      this.currentItem.img.naturalWidth / this.currentItem.img.naturalHeight
    this.scale = new THREE.Vector3(imageRatio, 1, 1)
    this.uniforms.uTexture.value = this.currentItem.texture
    //this.plane.scale.copy(this.scale)
    this.trails.forEach(trail => {
      trail.scale.copy(this.scale)
    })
  }
}

"use client"

import { useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import * as THREE from "three"

export function CookieJar3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!containerRef.current) return

    // Create scene
    const scene = new THREE.Scene()

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = 5

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0x000000, 0) // Transparent background
    containerRef.current.appendChild(renderer.domElement)

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Create a simple jar shape as a placeholder
    // In a real implementation, you would load a proper 3D model
    const jarGeometry = new THREE.CylinderGeometry(1.5, 1.2, 3, 32)
    const jarMaterial = new THREE.MeshPhongMaterial({
      color: theme === "dark" ? 0x8b4513 : 0xd2b48c,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
    })
    const jar = new THREE.Mesh(jarGeometry, jarMaterial)
    scene.add(jar)

    // Create a lid
    const lidGeometry = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32)
    const lidMaterial = new THREE.MeshPhongMaterial({
      color: theme === "dark" ? 0x654321 : 0xa0522d,
      shininess: 100,
    })
    const lid = new THREE.Mesh(lidGeometry, lidMaterial)
    lid.position.y = 1.65
    scene.add(lid)

    // Create some cookies inside the jar
    const cookieGeometry = new THREE.SphereGeometry(0.3, 16, 16)
    const cookieMaterial = new THREE.MeshPhongMaterial({
      color: 0xcd853f,
    })

    for (let i = 0; i < 8; i++) {
      const cookie = new THREE.Mesh(cookieGeometry, cookieMaterial)
      cookie.position.set(Math.random() * 1.2 - 0.6, Math.random() * 1 - 1.2, Math.random() * 1.2 - 0.6)
      cookie.scale.y = 0.3
      jar.add(cookie)
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      jar.rotation.y += 0.005
      lid.rotation.y += 0.005

      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return

      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      window.removeEventListener("resize", handleResize)
    }
  }, [theme])

  return <div ref={containerRef} className="w-full h-64 md:h-80 lg:h-96 cookie-jar-3d" aria-hidden="true" />
}


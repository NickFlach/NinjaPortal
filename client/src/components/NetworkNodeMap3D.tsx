import { FC, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { NetworkNode } from '@/contexts/MusicSyncContext'

interface NetworkNodeMap3DProps {
  nodes: NetworkNode[]
}

const Node: FC<{ position: [number, number, number], node: NetworkNode }> = ({ position, node }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1
    }
  })

  return (
    <group>
      {/* Glowing sphere for the node */}
      <Sphere ref={meshRef} position={position} args={[0.3, 32, 32]}>
        <meshStandardMaterial
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Node label */}
      <Html position={[position[0], position[1] + 0.5, position[2]]}>
        <div className="bg-black/50 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
          {node.id.slice(0, 6)}...
        </div>
      </Html>
    </group>
  )
}

const NodeConnections: FC<{ nodes: NetworkNode[] }> = ({ nodes }) => {
  // Generate positions for nodes in a circular layout
  const nodePositions = useMemo(() => {
    const radius = nodes.length <= 2 ? 2 : nodes.length
    return nodes.map((_, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      return [x, 0, z] as [number, number, number]
    })
  }, [nodes])

  // Create connections between nodes
  const connections = useMemo(() => {
    const lines: Array<[number, number]> = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        lines.push([i, j])
      }
    }
    return lines
  }, [nodes])

  return (
    <group>
      {/* Draw nodes */}
      {nodes.map((node, i) => (
        <Node key={node.id} position={nodePositions[i]} node={node} />
      ))}

      {/* Draw connections */}
      {connections.map(([i, j], index) => {
        const start = nodePositions[i]
        const end = nodePositions[j]
        const points = [start, end]
        
        return (
          <Line
            key={`${i}-${j}`}
            points={points}
            color="#4CAF50"
            lineWidth={1}
            opacity={0.5}
            transparent
          />
        )
      })}
    </group>
  )
}

const ParticleField: FC = () => {
  const particlesCount = 100
  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3)
    for (let i = 0; i < particlesCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15
    }
    return pos
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#4CAF50"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  )
}

export const NetworkNodeMap3D: FC<NetworkNodeMap3DProps> = ({ nodes }) => {
  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border bg-black/90">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Particle background effect */}
        <ParticleField />
        
        {/* Network nodes and connections */}
        <NodeConnections nodes={nodes} />
        
        {/* Camera controls */}
        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
    </div>
  )
}

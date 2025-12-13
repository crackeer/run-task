import {useEffect} from 'react'
import { createFileRoute } from '@tanstack/react-router'
import axios from 'axios'
export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  useEffect(() => {
    axios.get('/api/about').then(res => console.log(res.data))
  }, [])
  return <div className="p-2">Hello from About!</div>
}
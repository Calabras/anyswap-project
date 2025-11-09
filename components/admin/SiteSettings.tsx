// components/admin/SiteSettings.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SiteSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Site Name</label>
            <Input defaultValue="AnySwap" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Commission Rate (%)</label>
            <Input type="number" defaultValue="3" min="0" max="100" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Maintenance Mode</label>
            <Button variant="outline">Toggle Maintenance Mode</Button>
          </div>
          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


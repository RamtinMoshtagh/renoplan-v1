'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QuickCreateProject({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(() => action(formData));
  }

  return (
    <form action={onSubmit} className="grid gap-3 md:grid-cols-[1fr,180px,120px] items-end">
      <label className="grid gap-1">
        <span className="text-sm font-medium">Name</span>
        <Input
          name="name"
          placeholder="e.g., House renovation"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Total budget (kr)</span>
        <Input
          name="total_budget"
          inputMode="numeric"
          placeholder="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}

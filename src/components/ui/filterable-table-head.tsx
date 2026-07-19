"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"

export interface FilterOption {
  value: string
  label: string
}

interface FilterableTableHeadProps {
  title: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FilterableTableHead({
  title,
  options,
  value,
  onChange,
  className,
}: FilterableTableHeadProps) {
  const [open, setOpen] = useState(false)
  const isActive = value !== ""

  return (
    <TableHead className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "group inline-flex cursor-pointer items-center gap-1 rounded bg-transparent p-0 font-medium text-foreground hover:text-primary transition-colors",
            isActive && "text-primary"
          )}
        >
          <span>{title}</span>
          {isActive ? (
            <span className="flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] leading-none font-bold">
              ✓
            </span>
          ) : (
            <ChevronDown className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start" side="bottom" sideOffset={4}>
          <Command>
            <CommandInput placeholder={`搜索${title}...`} />
            <CommandList>
              <CommandEmpty>未找到</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => { onChange(""); setOpen(false) }}
                  className={cn(!isActive && "text-primary font-medium")}
                >
                  <Check className={cn("mr-2 h-4 w-4", !isActive ? "opacity-100" : "opacity-0")} />
                  全部{title}
                </CommandItem>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => { onChange(opt.value); setOpen(false) }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TableHead>
  )
}

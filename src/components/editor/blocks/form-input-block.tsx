import { createReactBlockSpec } from "@blocknote/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

export const FormInputBlock = createReactBlockSpec(
    {
        type: "formInput",
        propSchema: {
            label: {
                default: "Untitled Question",
            },
            placeholder: {
                default: "Type your answer here...",
            },
            required: {
                default: "false",
            },
            inputType: {
                default: "short", // short | long
            }
        },
        content: "none",
    },
    {
        render: (props) => {
            const [label, setLabel] = useState(props.block.props.label);
            const [placeholder, setPlaceholder] = useState(props.block.props.placeholder);
            const [required, setRequired] = useState(props.block.props.required === "true");

            // In editor mode, we just want to configure the field.

            return (
                <div className="w-full border rounded-md p-4 bg-background my-2 flex flex-col gap-4">
                    <div className="flex border-b pb-2 mb-2 justify-between items-center">
                        <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            ✏️ Form Field
                        </span>
                        <div className="flex items-center gap-2">
                            <Label htmlFor={`req-${props.block.id}`} className="text-xs">Required</Label>
                            <Switch
                                id={`req-${props.block.id}`}
                                checked={required}
                                onCheckedChange={(c: boolean) => {
                                    setRequired(c);
                                    props.editor.updateBlock(props.block, {
                                        props: { required: String(c) }
                                    });
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Label / Question</Label>
                        <Input
                            value={label}
                            onChange={(e) => {
                                setLabel(e.target.value);
                                // Debounce update? BlockNote handles it okay usually.
                                props.editor.updateBlock(props.block, {
                                    props: { label: e.target.value }
                                });
                            }}
                            className="font-medium"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Placeholder</Label>
                        <Input
                            value={placeholder}
                            onChange={(e) => {
                                setPlaceholder(e.target.value);
                                props.editor.updateBlock(props.block, {
                                    props: { placeholder: e.target.value }
                                });
                            }}
                            className="text-muted-foreground text-sm"
                        />
                    </div>
                </div>
            );
        },
    }
);

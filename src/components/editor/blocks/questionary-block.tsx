import { createReactBlockSpec } from "@blocknote/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

export const QuestionaryBlock = createReactBlockSpec(
    {
        type: "questionary",
        propSchema: {
            question: {
                default: "Untitled Question",
            },
            options: {
                default: "[\"Option 1\", \"Option 2\"]", // JSON string of options
            },
            correctAnswer: {
                default: "", // Empty string means survey mode (no correct answer)
            },
            type: {
                default: "single", // single | multiple (future)
            }
        },
        content: "none",
    },
    {
        render: (props) => {
            const [question, setQuestion] = useState(props.block.props.question);
            // Parse options safely
            let initialOptions = [];
            try {
                initialOptions = JSON.parse(props.block.props.options);
            } catch (e) {
                initialOptions = ["Option 1", "Option 2"];
            }
            const [options, setOptions] = useState<string[]>(initialOptions);
            const [correctAnswer, setCorrectAnswer] = useState(props.block.props.correctAnswer);

            const updateBlock = (newQuestion: string, newOptions: string[], newCorrect: string) => {
                props.editor.updateBlock(props.block, {
                    props: {
                        question: newQuestion,
                        options: JSON.stringify(newOptions),
                        correctAnswer: newCorrect
                    }
                });
            }

            const addOption = () => {
                const newOptions = [...options, `Option ${options.length + 1}`];
                setOptions(newOptions);
                updateBlock(question, newOptions, correctAnswer);
            };

            const removeOption = (idx: number) => {
                if (options.length <= 1) return;
                const newOptions = options.filter((_, i) => i !== idx);
                setOptions(newOptions);
                // If we removed the correct answer, reset it
                const removedValue = options[idx];
                const newCorrect = correctAnswer === removedValue ? "" : correctAnswer;
                setCorrectAnswer(newCorrect);
                updateBlock(question, newOptions, newCorrect);
            };

            const updateOptionText = (idx: number, text: string) => {
                const newOptions = [...options];
                // Should also update correct answer if it matches?
                // For simplicity, let's keep correct answer logic separate or update it if value matches
                const oldValue = newOptions[idx];
                newOptions[idx] = text;
                setOptions(newOptions);

                const newCorrect = correctAnswer === oldValue ? text : correctAnswer;
                setCorrectAnswer(newCorrect);

                updateBlock(question, newOptions, newCorrect);
            };

            const toggleCorrect = (opt: string) => {
                // If it's already correct, unselect (survey mode)
                // If different, select it
                const newCorrect = correctAnswer === opt ? "" : opt;
                setCorrectAnswer(newCorrect);
                updateBlock(question, options, newCorrect);
            };

            return (
                <div className="w-full border rounded-md p-4 bg-background my-2 flex flex-col gap-4">
                    <div className="flex border-b pb-2 mb-2 justify-between items-center">
                        <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            📊 Questionary
                        </span>
                        <div className="text-xs text-muted-foreground">
                            {correctAnswer ? "Quiz Mode" : "Survey Mode"}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground">Question</Label>
                        <Input
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                updateBlock(e.target.value, options, correctAnswer);
                            }}
                            className="font-medium"
                        />
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <Label className="text-xs text-muted-foreground">Options (Click circle to mark correct answer)</Label>
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => toggleCorrect(opt)}
                                    title={correctAnswer === opt ? "Correct Answer" : "Mark as Correct"}
                                >
                                    {correctAnswer === opt
                                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        : <Circle className="h-4 w-4 text-muted-foreground" />
                                    }
                                </Button>
                                <Input
                                    value={opt}
                                    onChange={(e) => updateOptionText(idx, e.target.value)}
                                    className={`h-8 ${correctAnswer === opt ? "border-green-500 bg-green-50/50" : ""}`}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeOption(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={addOption} className="w-fit mt-1">
                            <Plus className="h-3 w-3 mr-2" /> Add Option
                        </Button>
                    </div>
                </div>
            );
        },
    }
);

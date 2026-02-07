
import { createReactBlockSpec } from "@blocknote/react";
import { useFormReport } from "@/hooks/use-form-report";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, PieChart as PieChartIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ChartBlock = createReactBlockSpec(
    {
        type: "chart",
        propSchema: {
            dataSourceId: {
                default: "",
            },
        },
        content: "none",
    },
    {
        render: (props) => {
            const params = useParams();
            const projectId = params?.projectId as string;
            // Use local state for immediate feedback, but sync with block props
            const [selectedDoc, setSelectedDoc] = useState(props.block.props.dataSourceId);
            const [availableForms, setAvailableForms] = useState<any[]>([]);

            const { forms, reportData, loading, stats } = useFormReport(projectId, selectedDoc);

            // Sync prop changes to state
            useEffect(() => {
                if (props.block.props.dataSourceId !== selectedDoc) {
                    setSelectedDoc(props.block.props.dataSourceId);
                }
            }, [props.block.props.dataSourceId]);

            // Create a separate effect to load forms list if not loaded by the hook (optimisation)
            // Actually useFormReport handles fetching forms list too.

            return (
                <div className="my-4 border rounded-lg p-4 bg-background shadow-sm w-full select-none" contentEditable={false}>
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                        <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground">Report Chart</span>
                    </div>

                    {!selectedDoc ? (
                        <div className="flex flex-col gap-4 items-start">
                            <p className="text-sm text-muted-foreground">Select a form to display its data:</p>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-sm"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedDoc(val);
                                    props.editor.updateBlock(props.block, {
                                        props: { dataSourceId: val }
                                    });
                                }}
                                value=""
                            >
                                <option value="" disabled>Select Source...</option>
                                {forms.map(form => (
                                    <option key={form.id} value={form.id}>{form.title || "Untitled"}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="text-sm">
                                    <span className="font-bold">{forms.find(f => f.id === selectedDoc)?.title || "Unknown Form"}</span>
                                    <span className="mx-2 text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">{stats.totalSubmissions} Responses</span>
                                </div>
                                <button
                                    className="text-xs text-blue-500 hover:underline"
                                    onClick={() => {
                                        setSelectedDoc("");
                                        props.editor.updateBlock(props.block, {
                                            props: { dataSourceId: "" }
                                        });
                                    }}
                                >
                                    Change Source
                                </button>
                            </div>

                            {loading && <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6" /></div>}

                            {!loading && reportData.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded">No data available</div>
                            )}

                            {/* Charts Grid - Compact Grid for Block */}
                            {!loading && reportData.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {reportData.map((item) => (
                                        <Card key={item.blockId} className={item.type === 'list' ? 'md:col-span-2' : ''}>
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="text-sm font-medium">{item.question}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0">
                                                {item.type === 'bar' && (
                                                    <div className="h-[200px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={item.data}>
                                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                                                <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                                {item.type === 'pie' && (
                                                    <div className="h-[200px] w-full flex justify-center">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={item.data}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    labelLine={false}
                                                                    label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                                                                    outerRadius={60}
                                                                    fill="#8884d8"
                                                                    dataKey="value"
                                                                >
                                                                    {item.data.map((entry: any, index: number) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                                {item.type === 'list' && (
                                                    <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1">
                                                        {item.data.map((ans, i) => (
                                                            <div key={i} className="p-2 bg-muted/30 rounded border text-xs">
                                                                {ans}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        },
    }
);

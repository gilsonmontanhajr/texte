"use client";

import { useFormReport } from "@/hooks/use-form-report";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
    const params = useParams();
    const projectId = params?.projectId as string;
    const [selectedDoc, setSelectedDoc] = useState<string>("");

    const { forms, reportData, loading, stats } = useFormReport(projectId, selectedDoc);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground">Select a form to view submission insights.</p>
            </div>

            {/* Selection Area */}
            <div className="flex items-center gap-4">
                <div className="w-[300px]">
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedDoc}
                        onChange={(e) => setSelectedDoc(e.target.value)}
                    >
                        <option value="" disabled>Select a form...</option>
                        {forms.map(form => (
                            <option key={form.id} value={form.id}>
                                {form.title || "Untitled Form"}
                            </option>
                        ))}
                        {forms.length === 0 && <option disabled>No forms found</option>}
                    </select>
                </div>
                {/* Stats */}
                {selectedDoc && (
                    <div className="flex gap-4 text-sm text-muted-foreground border-l pl-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground">{stats.totalSubmissions}</span>
                            <span>Total Responses</span>
                        </div>
                        {stats.lastSubmission && (
                            <div className="flex flex-col">
                                <span className="font-bold text-foreground">
                                    {new Date(stats.lastSubmission).toLocaleDateString()}
                                </span>
                                <span>Last Response</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading && <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}

            {/* Charts Grid */}
            {!loading && selectedDoc && reportData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {reportData.map((item) => (
                        <Card key={item.blockId} className={item.type === 'list' ? 'lg:col-span-2' : ''}>
                            <CardHeader>
                                <CardTitle className="text-lg">{item.question}</CardTitle>
                                <CardDescription>{item.totalResponses} responses</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {item.type === 'bar' && (
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={item.data}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '8px' }}
                                                />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {item.type === 'pie' && (
                                    <div className="h-[300px] w-full flex justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={item.data}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }: any) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {item.data.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {item.type === 'list' && (
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                        {item.data.map((ans, i) => (
                                            <div key={i} className="p-3 bg-muted/30 rounded-md border text-sm">
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

            {!loading && selectedDoc && reportData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    No data to display. This form might not have any submissions yet.
                </div>
            )}

            {!selectedDoc && (
                <div className="text-center py-20 text-muted-foreground bg-muted/10 rounded-lg">
                    Please select a form above to begin.
                </div>
            )}
        </div>
    );
}

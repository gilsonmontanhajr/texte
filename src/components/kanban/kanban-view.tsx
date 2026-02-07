"use client";

import { useState, useMemo, useEffect } from "react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { TaskDetailsSheet } from "./task-details-sheet";

// --- Types ---
export type Id = string | number;

export type Column = {
    id: Id;
    title: string;
};

export type Task = {
    id: Id;
    columnId: Id;
    content: string;
    description?: string;
    tags?: string[];
    assignee?: { id: string; name?: string; email: string; avatarUrl?: string };
    comments?: { id: string; userId: string; userName?: string; text: string; createdAt: string }[];
};

interface KanbanViewProps {
    columns: Column[];
    tasks: Task[];
    setColumns: (cols: Column[]) => void;
    setTasks: (tasks: Task[]) => void;
    currentUser: any;
    collaborators: { email: string }[];
    onTaskComplete?: (taskName: string) => void;
    readOnly?: boolean;
}

// --- Sortable Task Item ---
function TaskCard({ task, deleteTask, onClick, readOnly }: { task: Task; deleteTask: (id: Id) => void; onClick: (task: Task) => void; readOnly?: boolean }) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "Task",
            task,
        },
        disabled: readOnly,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    // Robust click detection
    const [pointerStartTime, setPointerStartTime] = useState<number>(0);

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-background opacity-30 border p-3 h-[100px] min-h-[100px] items-center flex text-left rounded-xl cursor-grab relative"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onPointerDown={(e) => {
                setPointerStartTime(Date.now());
                listeners?.onPointerDown?.(e);
            }}
            onPointerUp={(e) => {
                // If quick tap (< 200ms), treat as click
                if (Date.now() - pointerStartTime < 200) {
                    console.log("Smart Click Triggered::", task.id);
                    e.stopPropagation();
                    e.preventDefault();
                    onClick(task);
                }
            }}
            className="bg-card p-3 h-[100px] min-h-[100px] items-start flex text-left rounded-xl hover:ring-2 hover:ring-primary/50 cursor-grab relative group border shadow-sm"
        >
            <p className="my-auto h-[90%] w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap pointer-events-none">
                {task.content}
            </p>
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                }}
                className={`stroke-gray-500 absolute right-4 top-1/2 -translate-y-1/2 bg-background p-2 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity pointer-events-auto ${readOnly ? 'hidden' : ''}`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

// --- Sortable Column ---
function ColumnContainer({ column, deleteColumn, updateColumn, tasks, createTask, deleteTask, onTaskClick, readOnly }: {
    column: Column;
    deleteColumn: (id: Id) => void;
    updateColumn: (id: Id, title: string) => void;
    tasks: Task[];
    createTask: (columnId: Id) => void;
    deleteTask: (id: Id) => void;
    onTaskClick: (task: Task) => void;
    readOnly?: boolean;
}) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: {
            type: "Column",
            column,
        },
        disabled: readOnly,
    });

    const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-muted/50 flex-1 min-w-[300px] h-[500px] max-h-[500px] rounded-md flex flex-col border-2 border-primary opacity-40 shrink-0"
            ></div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-muted/30 flex-1 min-w-[300px] h-[500px] max-h-[500px] rounded-md flex flex-col border shrink-0"
        >
            {/* Column Header */}
            <div
                {...attributes}
                {...listeners}
                className="bg-card/50 text-md h-[60px] cursor-grab rounded-md rounded-b-none p-3 font-bold border-b border-muted flex items-center justify-between"
            >
                <div className="flex gap-2 items-center">
                    <div className="flex justify-center items-center bg-muted px-2 py-1 text-sm rounded-full">
                        {tasks.length}
                    </div>
                    <Input
                        value={column.title}
                        onChange={(e) => updateColumn(column.id, e.target.value)}
                        className="bg-transparent focus:bg-background border-none border-transparent focus:border-input px-1 py-0 h-7 font-bold"
                    />
                </div>
                {!readOnly && (
                    <button
                        onClick={() => deleteColumn(column.id)}
                        className="stroke-gray-500 hover:bg-muted rounded px-1 py-2"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Tasks Container */}
            <div className="flex-grow flex flex-col gap-4 p-2 overflow-x-hidden overflow-y-auto">
                <SortableContext items={tasksIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} deleteTask={deleteTask} onClick={onTaskClick} readOnly={readOnly} />
                    ))}
                </SortableContext>
            </div>

            {/* Footer */}
            {!readOnly && (
                <button
                    className="flex gap-2 items-center border-t border-muted p-4 hover:bg-muted/50 hover:text-primary active:bg-black active:text-white rounded-b-md"
                    onClick={() => createTask(column.id)}
                >
                    <Plus size={16} /> Add Task
                </button>
            )}
        </div>
    );
}

export function KanbanView({ columns, tasks, setColumns, setTasks, currentUser, collaborators, onTaskComplete, readOnly }: KanbanViewProps) {
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [startColumnId, setStartColumnId] = useState<Id | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Local state for immediate UI updates
    const [localColumns, setLocalColumns] = useState<Column[]>(columns);
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

    // Sync from props to local state (when external changes happen)
    useEffect(() => {
        if (!activeColumn && !activeTask) {
            setLocalColumns(columns);
        }
    }, [columns, activeColumn, activeTask]);

    useEffect(() => {
        if (!activeColumn && !activeTask) {
            setLocalTasks(tasks);
        }
    }, [tasks, activeColumn, activeTask]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Helpers to update parent
    const commitColumns = (newCols: Column[]) => {
        setLocalColumns(newCols);
        setColumns(newCols);
    };

    const commitTasks = (newTasks: Task[]) => {
        setLocalTasks(newTasks);
        setTasks(newTasks);
    };

    // Actions
    function createColumn() {
        const columnToAdd: Column = {
            id: uuidv4(),
            title: `Column ${localColumns.length + 1}`,
        };
        commitColumns([...localColumns, columnToAdd]);
    }

    function deleteColumn(id: Id) {
        const newCols = localColumns.filter((col) => col.id !== id);
        const newTasks = localTasks.filter((t) => t.columnId !== id);
        setLocalColumns(newCols);
        setLocalTasks(newTasks);
        setColumns(newCols);
        setTasks(newTasks);
    }

    function updateColumn(id: Id, title: string) {
        const newCols = localColumns.map((col) => {
            if (col.id !== id) return col;
            return { ...col, title };
        });
        commitColumns(newCols);
    }

    function createTask(columnId: Id) {
        const newTask: Task = {
            id: uuidv4(),
            columnId,
            content: `Task ${localTasks.length + 1}`,
        };
        commitTasks([...localTasks, newTask]);
    }

    function deleteTask(id: Id) {
        commitTasks(localTasks.filter((task) => task.id !== id));
    }

    function onTaskUpdate(taskId: Id, updates: Partial<Task>) {
        const newTasks = localTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        setLocalTasks(newTasks);
        setTasks(newTasks);

        if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
        }
    }

    // Drag Handlers
    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === "Column") {
            setActiveColumn(event.active.data.current.column);
            return;
        }

        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
            setStartColumnId(event.active.data.current.task.columnId);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveColumn(null);
        setActiveTask(null);
        const prevColId = startColumnId;
        setStartColumnId(null);

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Commit local state to parent
        if (active.data.current?.type === "Column") {
            commitColumns(localColumns);
        }

        // Check for task completion macro
        if (active.data.current?.type === "Task") {
            let newColumnId: Id | null = null;
            if (over.data.current?.type === "Column") {
                newColumnId = over.id;
            } else if (over.data.current?.type === "Task") {
                newColumnId = over.data.current.task.columnId;
            }

            if (newColumnId === 'done' && prevColId !== 'done' && onTaskComplete) {
                onTaskComplete(active.data.current.task.content);
            }

            commitTasks(localTasks);
        }
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === "Task";
        const isOverTask = over.data.current?.type === "Task";

        if (!isActiveTask) return;

        // Dropping Task over Task
        if (isActiveTask && isOverTask) {
            const activeIndex = localTasks.findIndex((t) => t.id === activeId);
            const overIndex = localTasks.findIndex((t) => t.id === overId);

            if (activeIndex === -1 || overIndex === -1) return;

            const activeTask = localTasks[activeIndex];
            const overTask = localTasks[overIndex];

            const newTasks = [...localTasks];
            const newActiveTask = { ...activeTask };
            newTasks[activeIndex] = newActiveTask;

            if (activeTask.columnId !== overTask.columnId) {
                newActiveTask.columnId = overTask.columnId;
            }

            setLocalTasks(arrayMove(newTasks, activeIndex, overIndex));
        }

        const isOverColumn = over.data.current?.type === "Column";

        // Dropping Task over Column
        if (isActiveTask && isOverColumn) {
            const activeIndex = localTasks.findIndex((t) => t.id === activeId);
            if (activeIndex === -1) return;

            const activeTask = localTasks[activeIndex];
            if (activeTask.columnId !== overId) {
                const newTasks = [...localTasks];
                newTasks[activeIndex] = { ...activeTask, columnId: overId as Id };
                setLocalTasks(arrayMove(newTasks, activeIndex, activeIndex));
            }
        }

        // Column reordering visual update
        if (active.data.current?.type === "Column" && isOverColumn) {
            const activeIndex = localColumns.findIndex((col) => col.id === activeId);
            const overIndex = localColumns.findIndex((col) => col.id === overId);
            if (activeIndex !== overIndex) {
                setLocalColumns(arrayMove(localColumns, activeIndex, overIndex));
            }
        }
    }

    const columnsId = useMemo(() => localColumns.map((col) => col.id), [localColumns]);

    return (
        <div
            className="m-auto flex h-full w-full items-start overflow-x-auto overflow-y-hidden p-4"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
            >
                <div className="flex gap-4 w-full h-full">
                    <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                        {localColumns.map((col) => (
                            <ColumnContainer
                                key={col.id}
                                column={col}
                                deleteColumn={deleteColumn}
                                updateColumn={updateColumn}
                                createTask={createTask}
                                deleteTask={deleteTask}
                                tasks={localTasks.filter((task) => task.columnId === col.id)}
                                onTaskClick={setSelectedTask}
                                readOnly={readOnly}
                            />
                        ))}
                    </SortableContext>

                    {!readOnly && (
                        <button
                            onClick={() => createColumn()}
                            className="h-[60px] min-w-[200px] cursor-pointer rounded-lg bg-muted/50 border-2 border-dashed border-muted p-4 ring-primary hover:ring-2 flex gap-2 items-center justify-center shrink-0"
                        >
                            <Plus /> Add Column
                        </button>
                    )}
                </div>

                <DragOverlay>
                    {activeColumn && (
                        <ColumnContainer
                            column={activeColumn}
                            deleteColumn={deleteColumn}
                            updateColumn={updateColumn}
                            createTask={createTask}
                            deleteTask={deleteTask}
                            tasks={localTasks.filter((task) => task.columnId === activeColumn.id)}
                            onTaskClick={() => { }}
                        />
                    )}
                    {activeTask && (
                        <TaskCard task={activeTask} deleteTask={deleteTask} onClick={() => { }} />
                    )}
                </DragOverlay>
            </DndContext>

            <TaskDetailsSheet
                task={selectedTask}
                open={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                // We need to proxy the update back to parent via setTasks
                onUpdate={onTaskUpdate}
                currentUser={currentUser}
                collaborators={collaborators}
                readOnly={readOnly}
            />
        </div>
    );
}

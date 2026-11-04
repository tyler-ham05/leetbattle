// Context contains the state of the app
// Instead of having to pass props around each of the widgets, just
// subscribe to them here!
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { APIService, parseTestCases, Problem, RunResult, SubmitResult, TestCase } from './controller';

export type LoadingAction = 'run' | 'submit' | null;

export interface EditorContextValue {
	questions: Problem[];
	currentQuestion: Problem | null;
	setCurrentQuestion: (_question: Problem) => void;
	testCases: TestCase[];
	code: string;
	setCode: (_code: string) => void;
	error: string | null;
	onRun: () => void;
	onSubmit: () => void;
	runResult: RunResult | null;
	submitResult: SubmitResult | null;
	loadingAction: LoadingAction;
	isLoading: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
	const [questions, setQuestions] = useState<Problem[]>([]);
	const [currentQuestion, setCurrentQuestion] = useState<Problem | null>(null);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [runResult, setRunResult] = useState<RunResult | null>(null);
	const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
	const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
	const testCases = currentQuestion ? parseTestCases(currentQuestion.input_output) : [];

	useEffect(() => {
		const api = new APIService();
		api
			.generate()
			.then((problems) => {
				setQuestions(problems);
				setCurrentQuestion(problems[0] ?? null);
			})
			.catch((err) => setError(err.message));
	}, []);

	useEffect(() => {
		setCode(currentQuestion?.starter_code.replaceAll('\\n', '\n') ?? '');
	}, [currentQuestion]);

	const onRun = () => {
		if (loadingAction) {
			return;
		}
		setLoadingAction('run');
		const api = new APIService();
		api
			.run(code, testCases)
			.then(setRunResult)
			.catch((err) => setError(err.message))
			.finally(() => setLoadingAction(null));
	};

	const onSubmit = () => {
		if (!currentQuestion || loadingAction) {
			return;
		}
		setLoadingAction('submit');
		const api = new APIService();
		api
			.submit(currentQuestion.question_id, code)
			.then(setSubmitResult)
			.catch((err) => setError(err.message))
			.finally(() => setLoadingAction(null));
	};

	return (
		<EditorContext.Provider
			value={{
				questions,
				currentQuestion,
				setCurrentQuestion,
				testCases,
				code,
				setCode,
				error,
				onRun,
				onSubmit,
				runResult,
				submitResult,
				loadingAction,
				isLoading: loadingAction !== null,
			}}
		>
			{children}
		</EditorContext.Provider>
	);
}

export function useEditor(): EditorContextValue {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error('useEditor must be used within an EditorProvider');
	}
	return context;
}

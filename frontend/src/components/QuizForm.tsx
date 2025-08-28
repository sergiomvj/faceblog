import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Quiz, Article, ApiResponse } from '../services/api';
import apiService from '../services/api';

interface QuizFormProps {
  quiz?: Quiz;
  onSubmit: (quiz: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface QuizQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text';
  options?: string[];
  correct_answer: string;
  points: number;
}

const QuizForm: React.FC<QuizFormProps> = ({
  quiz,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: quiz?.title || '',
    description: quiz?.description || '',
    article_id: quiz?.article_id || '',
    difficulty: quiz?.difficulty || 'easy' as 'easy' | 'medium' | 'hard',
    time_limit: quiz?.time_limit || 0,
    passing_score: quiz?.passing_score || 70,
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    quiz?.questions?.map(q => ({
      question: q.question,
      type: q.type,
      options: q.options || [],
      correct_answer: q.correct_answer,
      points: q.points,
    })) || [
      {
        question: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 10,
      }
    ]
  );

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoadingArticles(true);
    try {
      const response = await apiService.getArticles();
      if (response.success && response.data) {
        setArticles(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 10,
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        if (field === 'type' && value !== 'multiple_choice') {
          return { ...q, [field]: value, options: [] };
        }
        if (field === 'type' && value === 'multiple_choice' && !q.options?.length) {
          return { ...q, [field]: value, options: ['', '', '', ''] };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.options) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.options && q.options.length > 2) {
        return { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) };
      }
      return q;
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.passing_score < 0 || formData.passing_score > 100) {
      newErrors.passing_score = 'Passing score must be between 0 and 100';
    }

    questions.forEach((question, index) => {
      if (!question.question.trim()) {
        newErrors[`question_${index}`] = 'Question text is required';
      }

      if (!question.correct_answer.trim()) {
        newErrors[`correct_answer_${index}`] = 'Correct answer is required';
      }

      if (question.type === 'multiple_choice' && question.options) {
        const validOptions = question.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          newErrors[`options_${index}`] = 'At least 2 options are required';
        }
        if (!question.options.includes(question.correct_answer)) {
          newErrors[`correct_answer_${index}`] = 'Correct answer must be one of the options';
        }
      }

      if (question.points <= 0) {
        newErrors[`points_${index}`] = 'Points must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const quizData = {
      ...formData,
      time_limit: formData.time_limit || undefined,
      article_id: formData.article_id || undefined,
      questions: questions.map(q => ({
        ...q,
        options: q.type === 'multiple_choice' ? q.options?.filter(opt => opt.trim()) : undefined,
      })),
    };

    await onSubmit(quizData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {quiz ? 'Edit Quiz' : 'Create New Quiz'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Quiz Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter quiz title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article (Optional)
              </label>
              <select
                value={formData.article_id}
                onChange={(e) => handleInputChange('article_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingArticles}
              >
                <option value="">Select an article (optional)</option>
                {articles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (minutes, 0 = no limit)
              </label>
              <input
                type="number"
                min="0"
                value={formData.time_limit}
                onChange={(e) => handleInputChange('time_limit', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.passing_score}
                onChange={(e) => handleInputChange('passing_score', parseInt(e.target.value) || 70)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.passing_score ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="70"
              />
              {errors.passing_score && (
                <p className="text-red-500 text-sm mt-1">{errors.passing_score}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quiz description"
              />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Questions</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-800">
                      Question {questionIndex + 1}
                    </h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Text *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                        rows={2}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`question_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter question text"
                      />
                      {errors[`question_${questionIndex}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`question_${questionIndex}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(questionIndex, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="text">Text Answer</option>
                      </select>
                    </div>
                  </div>

                  {/* Options for Multiple Choice */}
                  {question.type === 'multiple_choice' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Options *
                        </label>
                        <button
                          type="button"
                          onClick={() => addOption(questionIndex)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateQuestionOption(questionIndex, optionIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            {question.options && question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {errors[`options_${questionIndex}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`options_${questionIndex}`]}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correct Answer *
                      </label>
                      {question.type === 'multiple_choice' ? (
                        <select
                          value={question.correct_answer}
                          onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`correct_answer_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select correct answer</option>
                          {question.options?.filter(opt => opt.trim()).map((option, idx) => (
                            <option key={idx} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : question.type === 'true_false' ? (
                        <select
                          value={question.correct_answer}
                          onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`correct_answer_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select answer</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={question.correct_answer}
                          onChange={(e) => updateQuestion(questionIndex, 'correct_answer', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`correct_answer_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter correct answer"
                        />
                      )}
                      {errors[`correct_answer_${questionIndex}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`correct_answer_${questionIndex}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value) || 10)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`points_${questionIndex}`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="10"
                      />
                      {errors[`points_${questionIndex}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`points_${questionIndex}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {quiz ? 'Update Quiz' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizForm;

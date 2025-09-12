import QuestionDetail from '@/components/QuestionDetail';

interface QuestionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionPage({ params }: QuestionPageProps) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <QuestionDetail 
          questionId={id}
          onBack={() => window.history.back()}
        />
      </div>
    </div>
  );
}
-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  sector TEXT,
  exchange TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  report_url TEXT,
  raw_pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_summaries table
CREATE TABLE public.report_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  revenue TEXT,
  profit TEXT,
  growth TEXT,
  eps TEXT,
  pe_ratio TEXT,
  debt_equity TEXT,
  ebitda TEXT,
  current_ratio TEXT,
  roe TEXT,
  full_report_text TEXT,
  beat_or_miss TEXT CHECK (beat_or_miss IN ('Beat', 'Missed', 'In-line')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_summaries ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "Anyone can view reports"
  ON public.reports FOR SELECT USING (true);

CREATE POLICY "Anyone can view report summaries"
  ON public.report_summaries FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_reports_company_id ON public.reports(company_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_report_summaries_company_id ON public.report_summaries(company_id);
CREATE INDEX idx_report_summaries_report_id ON public.report_summaries(report_id);
CREATE INDEX idx_report_summaries_processed_at ON public.report_summaries(processed_at DESC);

-- Storage bucket for report PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('report-pdfs', 'report-pdfs', false);

CREATE POLICY "Report PDFs are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'report-pdfs');
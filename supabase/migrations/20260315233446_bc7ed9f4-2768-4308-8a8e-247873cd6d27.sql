-- Add foreign keys for contributions -> funds and contributions -> sabbath_accounts
ALTER TABLE public.contributions ADD CONSTRAINT contributions_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES public.funds(id);
ALTER TABLE public.contributions ADD CONSTRAINT contributions_sabbath_account_id_fkey FOREIGN KEY (sabbath_account_id) REFERENCES public.sabbath_accounts(id);
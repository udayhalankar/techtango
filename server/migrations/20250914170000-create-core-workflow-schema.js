'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = 'workflow_node_type'
          ) THEN
            CREATE TYPE public.workflow_node_type AS ENUM ('Start', 'Task', 'Decision', 'End');
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = 'workflow_task_status'
          ) THEN
            CREATE TYPE public.workflow_task_status AS ENUM (
              'Pending',
              'In Progress',
              'Completed',
              'Rejected',
              'Closed'
            );
          END IF;
        END
        $$;

        CREATE SEQUENCE IF NOT EXISTS public.workflows_id_seq;
        CREATE SEQUENCE IF NOT EXISTS public.workflow_instances_id_seq;
        CREATE SEQUENCE IF NOT EXISTS public.workflow_steps_id_seq;
        CREATE SEQUENCE IF NOT EXISTS public.workflow_audit_id_seq;

        CREATE TABLE IF NOT EXISTS public.workflows (
          id           integer NOT NULL DEFAULT nextval('public.workflows_id_seq'::regclass),
          created_by   text,
          created_at   timestamp without time zone DEFAULT now(),
          description  text,
          version      integer NOT NULL DEFAULT 1,
          updated_at   timestamp without time zone NOT NULL DEFAULT now(),
          config       jsonb NOT NULL DEFAULT '{}'::jsonb,
          modified_by  integer,
          modified_at  timestamp without time zone DEFAULT now(),
          workflow_id  bigint,
          name         text,
          graph        jsonb,
          assignee_id  text,
          CONSTRAINT workflows_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_instances (
          id               bigint NOT NULL DEFAULT nextval('public.workflow_instances_id_seq'::regclass),
          workflow_row_id  integer NOT NULL,
          workflow_id      bigint,
          workflow_name    text,
          version          integer,
          master_form_id   integer,
          master_row_id    bigint,
          started_by       text,
          started_at       timestamp with time zone DEFAULT now(),
          status           text,
          step_name        text,
          assigned_to      bigint,
          step_due_date    timestamp with time zone,
          updateform_id    integer,
          CONSTRAINT workflow_instances_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_tasks (
          id              integer GENERATED ALWAYS AS IDENTITY,
          instance_id     integer NOT NULL,
          node_id         text NOT NULL,
          assigned_to     integer,
          status          public.workflow_task_status NOT NULL DEFAULT 'Pending'::public.workflow_task_status,
          completed_at    timestamp without time zone,
          data            jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at      timestamp without time zone NOT NULL DEFAULT now(),
          updated_at      timestamp without time zone NOT NULL DEFAULT now(),
          created_by      integer,
          modified_by     integer,
          modified_at     timestamp without time zone DEFAULT now(),
          workflow_id     bigint,
          assignee_id     text,
          node_type       text,
          form_id         text,
          assignee_email  text,
          started_at      timestamp with time zone,
          CONSTRAINT workflow_tasks_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_nodes (
          id           integer GENERATED ALWAYS AS IDENTITY,
          workflow_id  integer NOT NULL,
          type         public.workflow_node_type NOT NULL,
          config       jsonb NOT NULL DEFAULT '{}'::jsonb,
          position     jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at   timestamp without time zone NOT NULL DEFAULT now(),
          updated_at   timestamp without time zone NOT NULL DEFAULT now(),
          created_by   integer,
          modified_by  integer,
          modified_at  timestamp without time zone DEFAULT now(),
          CONSTRAINT workflow_nodes_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_edges (
          id              integer GENERATED ALWAYS AS IDENTITY,
          workflow_id     integer NOT NULL,
          source_node_id  integer NOT NULL,
          target_node_id  integer NOT NULL,
          "condition"     text,
          created_at      timestamp without time zone NOT NULL DEFAULT now(),
          updated_at      timestamp without time zone NOT NULL DEFAULT now(),
          created_by      integer,
          modified_by     integer,
          modified_at     timestamp without time zone DEFAULT now(),
          CONSTRAINT workflow_edges_pkey PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_steps (
          id                   integer NOT NULL DEFAULT nextval('public.workflow_steps_id_seq'::regclass),
          workflow_id          integer,
          step_number          integer,
          step_name            text,
          assigned_user        text,
          cc_list              text[],
          action_type          text,
          send_email_to        text,
          status_on_completion text,
          created_at           timestamp without time zone DEFAULT now(),
          on_approve_send_to   text,
          on_reject_send_to    text,
          on_refer_send_to     text,
          on_submit_send_to    text,
          is_final_step        boolean DEFAULT false,
          CONSTRAINT workflow_steps_pkey PRIMARY KEY (id),
          CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id)
        );

        CREATE TABLE IF NOT EXISTS public.workflow_form_steps (
          workflow_id  integer,
          node_id      text,
          node_type    text,
          form_id      integer
        );

        CREATE TABLE IF NOT EXISTS public.workflow_audit (
          id           integer NOT NULL DEFAULT nextval('public.workflow_audit_id_seq'::regclass),
          workflow_id  integer,
          instance_id  integer,
          actor_id     integer,
          event        text NOT NULL,
          detail       jsonb DEFAULT '{}'::jsonb,
          ts           timestamp without time zone NOT NULL DEFAULT now(),
          created_by   integer,
          created_at   timestamp without time zone DEFAULT now(),
          modified_by  integer,
          modified_at  timestamp without time zone DEFAULT now(),
          CONSTRAINT workflow_audit_pkey PRIMARY KEY (id)
        );

        ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;
        ALTER SEQUENCE public.workflow_instances_id_seq OWNED BY public.workflow_instances.id;
        ALTER SEQUENCE public.workflow_steps_id_seq OWNED BY public.workflow_steps.id;
        ALTER SEQUENCE public.workflow_audit_id_seq OWNED BY public.workflow_audit.id;

        CREATE INDEX IF NOT EXISTS idx_wi_started_by ON public.workflow_instances (started_by);
        CREATE INDEX IF NOT EXISTS idx_wi_rowid ON public.workflow_instances (workflow_row_id);
        CREATE INDEX IF NOT EXISTS idx_wi_workflow ON public.workflow_instances (workflow_id);
        CREATE INDEX IF NOT EXISTS idx_wi_assigned_to ON public.workflow_instances (assigned_to);
        CREATE INDEX IF NOT EXISTS idx_wi_step_due_date ON public.workflow_instances (step_due_date);

        CREATE INDEX IF NOT EXISTS idx_wt_instance ON public.workflow_tasks (instance_id);
        CREATE INDEX IF NOT EXISTS idx_wt_assignee ON public.workflow_tasks (assignee_id);
        CREATE INDEX IF NOT EXISTS idx_wt_assignee_email ON public.workflow_tasks (assignee_email);
        CREATE INDEX IF NOT EXISTS idx_wt_status ON public.workflow_tasks (status);
        CREATE INDEX IF NOT EXISTS idx_wt_workflow_node ON public.workflow_tasks (workflow_id, node_id);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS public.workflow_audit;
        DROP TABLE IF EXISTS public.workflow_form_steps;
        DROP TABLE IF EXISTS public.workflow_steps;
        DROP TABLE IF EXISTS public.workflow_edges;
        DROP TABLE IF EXISTS public.workflow_nodes;
        DROP TABLE IF EXISTS public.workflow_tasks;
        DROP TABLE IF EXISTS public.workflow_instances;
        DROP TABLE IF EXISTS public.workflows;

        DROP SEQUENCE IF EXISTS public.workflow_audit_id_seq;
        DROP SEQUENCE IF EXISTS public.workflow_steps_id_seq;
        DROP SEQUENCE IF EXISTS public.workflow_instances_id_seq;
        DROP SEQUENCE IF EXISTS public.workflows_id_seq;

        DROP TYPE IF EXISTS public.workflow_task_status;
        DROP TYPE IF EXISTS public.workflow_node_type;
      `, { transaction });
    });
  }
};

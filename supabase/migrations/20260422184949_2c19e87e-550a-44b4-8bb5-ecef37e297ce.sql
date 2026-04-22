DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_cliente_id uuid := '9b53cd90-9472-452e-a649-1b839c80af49';
  v_email text := 'cnpj_21010659000107@distribuilucros.app';
  v_existing uuid;
BEGIN
  -- Verifica se já existe
  SELECT id INTO v_existing FROM auth.users WHERE email = v_email;
  IF v_existing IS NOT NULL THEN
    v_user_id := v_existing;
    -- Reseta senha para padrão
    UPDATE auth.users
    SET encrypted_password = crypt('2mCliente', gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object(
          'nome', 'BICALHO E ROMERO',
          'sobrenome', 'ADVOCACIA',
          'full_name', 'BICALHO E ROMERO ADVOCACIA',
          'must_change_password', true
        ),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt('2mCliente', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'nome', 'BICALHO E ROMERO',
        'sobrenome', 'ADVOCACIA',
        'full_name', 'BICALHO E ROMERO ADVOCACIA',
        'must_change_password', true
      ),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  END IF;

  -- Vincula como cliente aprovado e ativo
  INSERT INTO public.user_clientes (user_id, cliente_id, aprovado, ativo)
  VALUES (v_user_id, v_cliente_id, true, true)
  ON CONFLICT DO NOTHING;

  -- Atribui role cliente
  INSERT INTO public.user_roles (user_id, role, cliente_id)
  VALUES (v_user_id, 'cliente', v_cliente_id)
  ON CONFLICT DO NOTHING;
END $$;
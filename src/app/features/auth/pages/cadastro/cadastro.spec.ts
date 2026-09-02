import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css'
})
export class Cadastro {

  cadastroForm: FormGroup;

  constructor(private fb: FormBuilder) {

    this.cadastroForm = this.fb.group({
      nome: ['', [
        Validators.required,
        Validators.minLength(3)
      ]],

      email: ['', [
        Validators.required,
        Validators.email
      ]],

      senha: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],

      confirmarSenha: ['', [
        Validators.required
      ]]
    });

  }

  cadastrar(): void {

    if (this.cadastroForm.invalid) {

      this.cadastroForm.markAllAsTouched();

      return;
    }

    const senha = this.cadastroForm.get('senha')?.value;

    const confirmarSenha =
      this.cadastroForm.get('confirmarSenha')?.value;

    if (senha !== confirmarSenha) {

      alert('As senhas não coincidem.');

      return;
    }

    console.log('Dados do cadastro:');

    console.log(this.cadastroForm.value);

    alert('Cadastro realizado com sucesso!');

    this.cadastroForm.reset();
  }

}
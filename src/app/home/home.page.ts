import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { SpeechRecognition } from '@ionic-native/speech-recognition/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { TextToSpeech } from '@ionic-native/text-to-speech/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { Network } from '@ionic-native/network/ngx';
import { NFC } from '@ionic-native/nfc/ngx';
import { IBeacon } from '@ionic-native/ibeacon/ngx';
import { BLE } from '@ionic-native/ble/ngx';
import { Insomnia } from '@ionic-native/insomnia/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  
  // Variaveis do tipo STRING  
  private nomeProd: string;
  private marcaProd: string;  
  private precoProd: string;
  private pesoProd: string;
  private longProd: string;
  private latProd: string;
  private textoTraduzido: string = "";   
  private textoConfirmacao: string = ""; 
  private idBeacon: string = "";
  private readonly database_name: string = "TCC.db"; 
  private readonly table_name: string = "produto_teste_tres"; 
  //private readonly table_name: string = "produtos_tcc_final"; 

  // Variaveis do tipo NUMBER
  private rssi: number;  
  private distanciaMediaBeacon: number;
  private distanciaBeacon: number;
  private distanciaFinal: number;
  private distanciaProd: number;
  private countRSSI: number = 0;
  private somaRSSI: number = 0;

  // Variaveis do tipo BOOLEAN
  private prodInfo: boolean = false;
  private continuaProd: boolean = false;
  private encontraSecao: boolean = false;

  // Variaveis do tipo ANY
  private locationCoords: any;   
  
  // Variaveis do tipo DATE
  private dataValiProd: Date;

  // Variaveis do tipo SQLiteObject
  private databaseObj: SQLiteObject; 
       
  constructor(private speechRecognition: SpeechRecognition, private screenOrientation: ScreenOrientation, private statusBar: StatusBar, private tts: TextToSpeech, 
              public loadingController: LoadingController, private vibration: Vibration, private androidPermissions: AndroidPermissions, private geolocation: Geolocation,
              private locationAccuracy: LocationAccuracy, private sqlite: SQLite, private network: Network, private nfc: NFC, private ibeacon: IBeacon, private ble: BLE, private insomnia: Insomnia) {
    this.locationCoords = {
      latitude: "",
      longitude: ""
    }

    this.network.onDisconnect().subscribe(() => {
      this.playVoz('Por favor verifique sua conexão com a internet!');
    });
    
    this.checkNFC();
    this.lerNFC();  
    this.informacaoDistBeacon(1);    
  }

  ngOnInit() {
    // Definindo sempre modo retrato
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);

    // Deixa claro o statusBar do celular
    this.statusBar.styleBlackOpaque();

    // Verificando se o Bluetooth esta ativado ou nao
    this.checkBluetooth();

    // Verificando permissao para microfone do celular
    this.checkVozPermission();

    // Verificando permissao para GPS
    setTimeout(() => { this.checkGPSPermission() }, 4000);

    // Criando base de dados
    this.createDB();

    // Impedir que celular adormeça
    this.NoCelularInsonia();
  }

  public PesquisaProd() {  
    if (this.network.type != 'none') {      
      this.continuaProd = true;      
      this.checkNFC();        
    } else {
      this.playVoz('Não será possível consultar o produto, pois não possui conexão com a internet!');
    }
  }

  private checkNFC() {
    this.nfc.enabled()
    .then (() => {
      if (this.continuaProd) {
        this.askToTurnOnGPS(2);
      }
    }).catch(e => {
      if (e == 'NFC_DISABLED') {
        this.playVoz('Por favor, ative o modo NFC do seu celular!');        
      }
      if (e == 'NO_NFC') {
        this.playVoz('Infelizmente, não será possível realizar as atividades do aplicativo Zani Acessibilidade, pois seu celular não possui a tecnologia NFC!');
      }      
    });
  }

  private lerNFC() {
    this.nfc.addNdefListener().subscribe(data => {
      if (data && data.tag && data.tag.id) {
        if (data.tag.ndefMessage) {
          let payload = data.tag.ndefMessage[0].payload;
          let tagContent = this.nfc.bytesToString(payload).substring(3);
          this.informacaoProduto(tagContent);
        } else {
          this.playVoz('A etiqueta, não possui nenhuma informação!');
          this.controlerCarregamento('A etiqueta não possui nenhuma informação...', 3000);
        }
      }
    });
  }

  private checkVozPermission() {
    // Verificando a permissao de voz e solicita permissao
    this.speechRecognition.hasPermission()
    .then((hasPermission: boolean) => {
      if (!hasPermission) {           
        this.speechRecognition.requestPermission();
      }
    });
  }

  private checkGPSPermission() {
    // Verifique se o aplicativo tem permissão de acesso GPS
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
    .then(result =>{
      if (result.hasPermission) {
        //Se tiver permissão, mostre a caixa de diálogo "Ativar GPS"
        this.askToTurnOnGPS(1);
      } else {
        //Se não tiver permissão, peça permissão
        this.requestGPSPermission();
      }
    });
  }

  private askToTurnOnGPS(_opcao: number) {    
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY)
    .then(() => {      
      if (_opcao == 2) {                        
        this.playVoz('Por favor informe o produto que deseja encontrar!');
        this.controlerCarregamento('Por favor informe o produto que deseja encontrar...', 3000);
        setTimeout(() => { this.startVoz() }, 3010); 
      }                    
    }).catch(() => {         
      this.playVoz('Erro ao solicitar permissão de localização!');      
    });
  }

  private requestGPSPermission() {
    this.locationAccuracy.canRequest()
    .then((canRequest: boolean) => {
      if (canRequest) {
        console.log("Sucesso Permissao GPS!");
      } else {
        //Mostrar o diálogo 'Solicitação de permissão GPS'
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
        .then(() => {
          //Método de chamada para ativar o GPS
          this.askToTurnOnGPS(1);          
        })
      }
    });
  }

  private startVoz() {
    // Processo de reconhecimento de voz
    let options = {
      language: 'pt-BR',
      matches: 1,
      prompt: 'Estou te ouvindo! :)',  
      showPopup: true,                
    }
    
    this.speechRecognition.startListening(options)
    .subscribe(matches => {
      if (matches && matches.length > 0) {
        this.textoTraduzido = matches[0];  
        this.prodInfo = true;      
        this.getRows(this.textoTraduzido);                 
      }
    },(onerror) => {
      console.log('error:', onerror);    
    })
  }

  private playVoz(_text: string) {
    // Processo de falar
    this.tts.speak({
      text : _text,
      locale: 'pt-BR',
      rate: 1
    }).then(() => {
      console.log('Successo voz!!');
    }).catch((reason: any) => {
      console.log(reason);
    })
  }

  private async controlerCarregamento(_text: string, _time: number) {
    const loading = await this.loadingController.create({
      spinner: "lines",
      duration: _time,
      message: _text,
      cssClass: 'custom-class custom-loading'
    });
    
    await loading.present();
    await loading.onDidDismiss();
    return console.log('Sucesso controler!');
  }

  private createDB() {
    this.sqlite.create({
      name: this.database_name,
      location: 'default'
    })
    .then((db: SQLiteObject) => {
      this.databaseObj = db;
      this.createTable();
      console.log('DataBase criado!');
    }).catch(e => {
      console.log("Erro database " + JSON.stringify(e));
    });
  }

  private createTable() {
    this.databaseObj.executeSql('CREATE TABLE IF NOT EXISTS ' + this.table_name + ' '+
    '(id_produto INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, '+
    'cod_prod            TEXT NOT NULL, '+
    'nome_prod           TEXT NOT NULL, '+
    'marca_prod          TEXT NOT NULL, '+
    'data_validade_prod  DATE NOT NULL, '+
    'preco_prod          DOUBLE NOT NULL, '+
    'peso                TEXT NOT NULL, '+
    'latitude            TEXT NOT NULL, '+
    'longitude           TEXT NOT NULL) ', [])
    .then(() => {            
      this.insertRow();
      console.log('Tabela criado!');
    }).catch(e => {
      console.log("Erro ao criar tabela " + JSON.stringify(e));
    });
  }
  
  private insertRow() {  
    this.databaseObj.executeSql("SELECT COUNT(*) AS qtd FROM " + this.table_name, []) 
    .then((res) => {      
      if (res.rows.item(0).qtd == 0) {
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '1', 'Uva Verde', 'Doce Mel', '2020-10-20', 7.49, '500 gramas', '-10.882254', '-61.968089'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '2', 'Feijão Preto', 'Carioca', '2021-08-10', 8.99, '1 quilo', '-10.882252', '-61.96809'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '3', 'Arroz Integral', 'Tio Urbano', '2022-03-02', 14.39, '5 quilos', '-10.88225', '-62.96809'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '1', 'Leite Integral', 'Italac', '2019-12-25', 2.59, '1 litro', '-10.882248', '-61.968083'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '5', 'Café Tradicional', 'Três Corações', '2021-06-30', 7.99, '500 gramas', '-10.882255', '-61.968089'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '2', 'Farinha de Trigo', 'Anaconda', '2020-01-22', 5.99, '1 quilo', '-10.882253', '-61.968089'])
        .then(() => {          
          console.log('Registros inseridos!');
        }).catch(e => {
          console.log("Erro ao inserir registros " + JSON.stringify(e));
        });
      }
    }).catch(e => {
      console.log("Erro consultar total registros " + JSON.stringify(e));
    });
  }

  private getRows(_produto: string){
    this.databaseObj.executeSql("SELECT nome_prod, marca_prod, data_validade_prod, REPLACE(preco_prod, '.', ' reais e ') || ' centavos' AS preco_prod, peso, latitude, longitude "+
                                "FROM " + this.table_name + " WHERE (nome_prod LIKE ?)", ['%' + _produto + '%'])
    .then((res) => {            
      if (res.rows.length > 0) {        
        for (var i = 0; i < res.rows.length; i++) {             
          this.nomeProd = res.rows.item(i).nome_prod;  
          this.marcaProd = res.rows.item(i).marca_prod;
          this.dataValiProd = res.rows.item(i).data_validade_prod;
          this.precoProd = res.rows.item(i).preco_prod;
          this.pesoProd = res.rows.item(i).peso;     
          this.longProd = res.rows.item(i).longitude;
          this.latProd = res.rows.item(i).latitude;
          if (this.prodInfo) {   
            this.playVoz('Aguarde, localizando o local do produto!');
            this.controlerCarregamento('Aguarde localizando o local do produto...', 3500);               
            this.rotaSecao();
          }
        }
      } else {
        this.vibration.vibrate(1000);    
        this.prodInfo = false; 
        this.continuaProd = false;       
        this.playVoz('Produto não encontrado!');
        this.controlerCarregamento('Produto não encontrado...', 2000);
      }
    }).catch(()=> {      
      this.playVoz("Erro ao realizar consulta do produto!");
    });
  }
 
  private informacaoProduto(_nomeProd: string) {
    if (this.prodInfo) {
      if (_nomeProd == this.nomeProd) {
        this.controlerCarregamento('Informações do produto...', 16000);
        this.playVoz('Etiqueta lida com sucesso!');
        setTimeout(() => { this.playVoz('Informações do item: '+ 
          'Produto: '+ this.nomeProd +', '+        
          'Marca: '+ this.marcaProd +', '+
          'Data de Validade: '+ this.dataValiProd +', '+
          'Preço: '+ this.precoProd +', '+
          'Peso: '+ this.pesoProd +'')
        }, 2500);
        this.prodInfo = false;
        this.continuaProd = false;
      } else {
        this.playVoz('A etiqueta lida, não é o produto que foi informado!');
        this.controlerCarregamento('A etiqueta lida, não é o produto que foi informado!', 4000); 
      }
    } else {
      this.getRows(_nomeProd);
      setTimeout(() => {
        this.controlerCarregamento('Deseja saber as informações do produto ?', 12000);
        this.playVoz('Etiqueta lida com sucesso. Produto identificado, é '+ this.nomeProd + '. Deseja saber as informações desse produto? Sim ou Não.');
      }, 1000);

      setTimeout(() => { this.ConfirmaInformacaoProdVoz() }, 12000);
    }
  }
  
  private ConfirmaInformacaoProdVoz() {    
    let options = {
      language: 'pt-BR',
      matches: 1,
      prompt: 'Estou te ouvindo! :)',  
      showPopup: true,                
    }
    
    this.speechRecognition.startListening(options)
    .subscribe(matches => {
      if (matches && matches.length > 0) {
        this.textoConfirmacao = matches[0];               
        
        if (this.textoConfirmacao == "sim") {
          this.controlerCarregamento('Informações do produto...', 14000);
          this.playVoz('Informações do item: '+ 
            'Produto: '+ this.nomeProd +', '+        
            'Marca: '+ this.marcaProd +', '+
            'Data de Validade: '+ this.dataValiProd +'. '+
            'Preço: '+ this.precoProd +', '+
            'Peso: '+ this.pesoProd +'');
    
          this.prodInfo = false; 
          this.continuaProd = false;
        }
      }
    },(onerror) => {
      console.log('error:', onerror);    
    })
  }

  private rotaSecao() {
    this.countRSSI = 0; 
    this.somaRSSI = 0;
    this.encontraSecao = false;

    this.startConexaoBeacon();

    setTimeout(() => {  
      if (this.idBeacon != "") {    
        if (this.distanciaFinal > 4) { 
          this.vibration.vibrate(1000);              
          this.playVoz('O produto se localiza no laboratório 2. Aproximadamente a ' + this.distanciaFinal + ' metros de distância. Por favor siga até o laboratório 2!');  
          this.controlerCarregamento('O produto se localiza no laboratório II aproximadamente a ' + this.distanciaFinal + ' metros de distância. Por favor siga até o laboratório II...', 10000); 
          
          setTimeout(() => {
            let idDistancia = setInterval( () => {            
              this.encontraSecao = false;
              this.controlerCarregamento('Por favor dirigir-se até o laboratório II...', 4000);
              this.startConexaoBeacon();                               
            }, 4300);

            let idValida = setInterval( () => {                          
              if (this.distanciaFinal <= 4) {
                this.vibration.vibrate(1000); 
                this.playVoz('Você já se encontra no local onde está o produto!'); 
                this.encontraSecao = true;
                clearInterval(idDistancia);
                clearInterval(idValida);                
                setTimeout(() => {
                  this.rotaProduto();
                }, 5000);
              } 
            }, 4300);   
          }, 10010);          
        } else {
          this.vibration.vibrate(1000); 
          this.playVoz('O produto se localiza no laboratório 2. Você já se encontra no local onde está o produto!'); 
          this.controlerCarregamento('O produto se localiza no laboratório II. Você já se encontra no local onde está o produto...', 6000);           
          setTimeout(() => {
            this.rotaProduto();
          }, 7000);
        }
      }
    }, 4010);
  }

  private informacaoDistBeacon(_opcaoBeacon: number) {
    this.ble.connect("EB:50:91:93:CC:BA").subscribe(() => {
      if (_opcaoBeacon == 2) {
        this.ble.readRSSI("EB:50:91:93:CC:BA")
        .then((device) =>{                       
          this.rssi = parseInt(JSON.stringify(device)); 
          this.idBeacon = "OK";

          setTimeout(() => {                          
            this.calculaDistanciaBeacon(this.rssi);                         
          }, 2000);                      
        }).catch(() => {
          this.playVoz('Não foi possível obter as informações do local, onde se encontra o produto!');   
          this.prodInfo = false;
          this.continuaProd = false; 
          this.idBeacon = "";       
        });
      }
    });
  }

  private startConexaoBeacon() {
    this.ble.isConnected("EB:50:91:93:CC:BA")
    .then(() => {           
      this.informacaoDistBeacon(2);
    }).catch(() => {  
      this.forcaConexaoBeacon();
    });    
  }

  private forcaConexaoBeacon() {
    this.ble.connect("EB:50:91:93:CC:BA").subscribe(() => { 
      console.log('Conectando novamento com o beacon');
    });

    setTimeout(() => {  
      this.ble.isConnected("EB:50:91:93:CC:BA")
      .then(() => {            
        this.informacaoDistBeacon(2);
      }).catch(() => {  
        if (!this.encontraSecao) {     
          this.playVoz('Não será possivel, consultar o local do produto. Pois não foi possível conectar com o Beacon.');       
          this.prodInfo = false;
          this.continuaProd = false;
          this.idBeacon = "";
        }   
      });   
    }, 2000); 
  }

  private calculaDistanciaBeacon(_rssi: number) { 
    // txPower recebido do Beacon
    var txPower = -100;  
    var distBeacon = 0;

    // Calcula a distancia media do RSSI recebido
    this.countRSSI ++;
    this.somaRSSI = this.somaRSSI + _rssi;

    var mediaRSSI = this.somaRSSI / this.countRSSI;

    var ratio_media = txPower - mediaRSSI;
    var ratio_linear_media = Math.pow(10, ratio_media / 10);

    this.distanciaMediaBeacon = Math.sqrt(ratio_linear_media);
    //-------------------------------------------------------------------------

    //Calcula a distancia do RSSI em tempo real
    var ratio = txPower - _rssi;
    var ratio_linear = Math.pow(10, ratio / 10);
    this.distanciaBeacon = Math.sqrt(ratio_linear);
    //------------------------------------------------------------------------- 

    if (this.distanciaMediaBeacon < this.distanciaBeacon) {        
      distBeacon = this.distanciaMediaBeacon;     
    } else {        
      distBeacon = this.distanciaBeacon;        
    }

    // Transformando distancia do beacon de CM para Metros
    var dist_cm = distBeacon.toFixed(2);
    var dist_metros = (parseFloat(dist_cm) * 100).toFixed(0);
    this.distanciaFinal = parseInt(dist_metros);

    return this.distanciaFinal;    
  }

  private rotaProduto() {

    this.playVoz('Aguarde encontrando o produto...');
    this.controlerCarregamento('Aguarde encontrando o produto...', 2400);
    this.localizarDispositivo();

    setTimeout(() => {
      if (typeof this.distanciaProd === "undefined") {
        this.playVoz('Não foi possível localizar o produto desejado. Por favor repita o processo novamente!');
        this.controlerCarregamento('Não foi possível localizar o produto desejado. Por favor repita o processo novamente...', 6000);
      } else {
        if (this.distanciaProd <= 3) {             
          this.vibration.vibrate(1000); 
          this.playVoz('O produto desejado se encontra em uma distância aproximadamente de ' + this.distanciaProd + ' metro de distância. Por favor aproxime seu celular até o produto!'); 
          this.controlerCarregamento('O produto desejado se encontra em uma distância aproximadamente de ' + this.distanciaProd + ' metro de distância...', 6000);                                              
        } else {          
          this.vibration.vibrate(1000);         
          this.playVoz('Produto encontrado. O produto se localiza, aproximadamente a ' + this.distanciaProd + ' metros de distância!'); 
          this.controlerCarregamento('Produto encontrado, o produto se localiza aproximadamente a ' + this.distanciaProd + ' metros de distância...', 6000); 

          /*
          setTimeout(() => {
            let idDistanciaProd = setInterval(() => { 
              this.controlerCarregamento('Por favor dirigir-se até o produto...', 2500);           
              this.localizarDispositivo();
            }, 3000);

            let idStopDistanciaProd = setInterval(() => {          
              if (this.distanciaProd <= 3) {              
                clearInterval(idDistanciaProd);
                clearInterval(idStopDistanciaProd);
                this.vibration.vibrate(1000); 
                this.playVoz('O produto desejado se encontra em uma distância aproximadamente de ' + this.distanciaProd + ' metro de distância. Por favor aproxime seu celular até o produto!'); 
                this.controlerCarregamento('O produto desejado se encontra em uma distância aproximadamente de ' + this.distanciaProd + ' metro de distância...', 6000);
              }            
            }, 3000);
          }, 6001);
          */
        }
      }
    }, 4000);
  }

  private localizarDispositivo() {
    this.geolocation.getCurrentPosition({
      enableHighAccuracy: true
    })
    .then((resp) => {
      this.locationCoords.latitude = resp.coords.latitude;
      this.locationCoords.longitude = resp.coords.longitude; 

      this.calculaDistanciaProd(this.locationCoords.latitude, this.locationCoords.longitude, parseFloat(this.latProd), parseFloat(this.longProd));
    }).catch(() => {
      this.playVoz('Erro ao obter a localização!');            
    });
  }

  private calculaDistanciaProd(_lat1: number, _lon1: number, _lat2: number, _lon2: number) {
    var deg2rad = 0.017453292519943295; // Math.PI / 180
    var cos = Math.cos;    

    _lat1 *= deg2rad;
    _lon1 *= deg2rad;
    _lat2 *= deg2rad;
    _lon2 *= deg2rad;

    var diam = 12742; // Diâmetro da terra em km
    var dLat = _lat2 - _lat1;
    var dLon = _lon2 - _lon1;
    var a = ((1 - cos(dLat)) + 
             (1 - cos(dLon)) * cos(_lat1) * cos(_lat2)) / 2;

    this.distanciaProd = parseInt((diam * Math.asin(Math.sqrt(a)) * 1000).toFixed(0));
    
    return this.distanciaProd;
  }

  private checkBluetooth() {
    this.ibeacon.isBluetoothEnabled()
    .then(isEnabled => {
      if (!isEnabled) {        
        this.ibeacon.enableBluetooth();
      }
    });
  }

  private NoCelularInsonia() {
    this.insomnia.keepAwake()
    .then(() => {
      console.log('Impedindo que a tela do dispositivo móvel adormeça');
    });
  }
}

